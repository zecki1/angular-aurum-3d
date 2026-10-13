import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { AccessibilityService, ModoVisao, ROTULO_VISAO } from '../../core/accessibility.service';
import { apósRender } from '../../core/apos-render';

interface ModoVisaoItem {
  valor: ModoVisao;
  rotulo: string;
}

const MODOS: ModoVisaoItem[] = (
  ['nenhum', 'monocromatico', 'protanopia', 'deuteranopia', 'tritanopia', 'baixo-contraste'] as const
).map((valor) => ({ valor, rotulo: ROTULO_VISAO[valor] }));

interface AlternavelItem {
  nome: 'altoContraste' | 'linhasGuia' | 'reduzMovimento';
  rotulo: string;
  descricao: string;
}

const ALTERNAVEIS: AlternavelItem[] = [
  {
    nome: 'altoContraste',
    rotulo: 'Alto contraste',
    descricao: 'Fundo preto puro e texto branco',
  },
  {
    nome: 'linhasGuia',
    rotulo: 'Linhas-guia de leitura',
    descricao: 'Grade de referência sobre a página',
  },
  {
    nome: 'reduzMovimento',
    rotulo: 'Reduzir animações',
    descricao: 'Corta transições e a rotação da cena 3D',
  },
];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  selector: 'app-accessibility-hub',
  styleUrl: './accessibility-hub.css',
  templateUrl: './accessibility-hub.html',
})
export class AccessibilityHub {
  readonly a11y = inject(AccessibilityService);
  private readonly destroyRef = inject(DestroyRef);

  readonly painel = viewChild.required<ElementRef<HTMLElement>>('painel');
  private readonly gatilho = viewChild.required<ElementRef<HTMLButtonElement>>('gatilho');

  readonly aberto = signal(false);
  readonly modos = MODOS;
  readonly alternaveis = ALTERNAVEIS;

  /** Índice do modo de visão selecionado — base do tabindex roving. */
  readonly indiceModo = computed(() => MODOS.findIndex((m) => m.valor === this.a11y.visao()));

  /** O painel só existe para a tecnologia assistiva quando está aberto. */
  readonly inativo = computed(() => !this.aberto());

  constructor() {
    // `aria-hidden` no painel deixava os 10 controles internos focáveis por Tab
    // (violação `aria-hidden-focus`). `inert` resolve os dois de uma vez: some da
    // ordem de tabulação e da árvore de acessibilidade, sem CSS fragile.
    effect(() => {
      const inativo = this.inativo();
      const el = this.painel().nativeElement;
      if (inativo) {
        el.setAttribute('inert', '');
        el.setAttribute('aria-hidden', 'true');
      } else {
        el.removeAttribute('inert');
        el.removeAttribute('aria-hidden');
      }
    });


    this.destroyRef.onDestroy(() => this.fechar(false));
  }

  /** `Escape` em qualquer lugar da página fecha o hub (WAI-ARIA: diálogo). */
  @HostListener('document:keydown', ['$event'])
  aoTeclaGlobal(event: KeyboardEvent): void {
    if (event.key === 'Escape') this.aoTecla(event);
  }

  /** Clique fora do painel fecha — o hub é non-modal, não pode roubar o clique. */
  @HostListener('document:pointerdown', ['$event'])
  aoPonteiroGlobal(event: PointerEvent): void {
    this.aoPonteiro(event);
  }

  abrir(): void {
    if (this.aberto()) return;
    this.aberto.set(true);
    // Foco entra no painel (no botão de fechar) para o leitor de tela ancorar
    // o contexto — sem isso, o diálogo abre "no vácuo".
    // `apósRender` porque o signal `aberto` só vira DOM utilizável no ciclo
    // seguinte; com `focus()` síncrono o painel ainda estaria `inert` sob zoneless.
    apósRender(() => this.painel().nativeElement.querySelector<HTMLElement>('.hub-fechar')?.focus());
  }

  fechar(devolverFoco = true): void {
    if (!this.aberto()) return;
    this.aberto.set(false);
    if (devolverFoco) apósRender(() => this.gatilho().nativeElement.focus());
  }

  alternarPainel(): void {
    if (this.aberto()) this.fechar();
    else this.abrir();
  }

  /** Fecha ao clicar fora do painel (componente usa `pointerdown` no documento). */
  aoPonteiro(event: PointerEvent): void {
    if (!this.aberto()) return;
    const alvo = event.target as Node | null;
    const noPainel = alvo && this.painel().nativeElement.contains(alvo);
    const noGatilho = alvo && this.gatilho().nativeElement.contains(alvo);
    if (!noPainel && !noGatilho) this.fechar(false);
  }

  /** `Escape` fecha o hub e devolve o foco ao gatilho. */
  aoTecla(event: KeyboardEvent): void {
    if (!this.aberto()) return;
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    this.fechar();
  }

  /**
   * Navegação por setas do grupo de visão (padrão WAI-ARIA `radiogroup`):
   * as opções são irmãs, então só a selecionada entra na ordem de tabulação.
   */
  aoTeclaModo(event: KeyboardEvent, indice: number): void {
    const salto: Record<string, number> = {
      ArrowRight: 1,
      ArrowDown: 1,
      ArrowLeft: -1,
      ArrowUp: -1,
    };
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      this.focarModo(event.key === 'Home' ? 0 : MODOS.length - 1);
      return;
    }
    const passo = salto[event.key];
    if (passo === undefined) return;
    event.preventDefault();
    const proximo = (indice + passo + MODOS.length) % MODOS.length;
    this.focarModo(proximo);
  }

  /** Atalho de teclado num switch customizado: `Espaço`/`Enter` já natively disparam click. */
  estaAtivo(nome: AlternavelItem['nome']): boolean {
    return nome === 'altoContraste'
      ? this.a11y.altoContraste()
      : nome === 'linhasGuia'
        ? this.a11y.linhasGuia()
        : this.a11y.reduzMovimento();
  }

  /**
   * O switch diz a verdade sobre a página, não só sobre o botão. Quando o
   * sistema pede movimento reduzido e o usuário não mexeu no botão, a página já
   * está sem animação — dizer só "Desligado" seria mentir sobre o que ele vê.
   */
  descricaoAlternavel(nome: AlternavelItem['nome']): string {
    const base = ALTERNAVEIS.find((a) => a.nome === nome)?.descricao ?? '';
    if (
      nome === 'reduzMovimento' &&
      this.a11y.sistemaReduzMovimento() &&
      !this.a11y.reduzMovimento()
    ) {
      return `${base}. O seu sistema já pede movimento reduzido, então a página já está assim.`;
    }
    return base;
  }

  private focarModo(indice: number): void {
    const modo = MODOS[indice];
    if (!modo) return;
    this.a11y.definirVisao(modo.valor);
    const botoes = this.painel().nativeElement.querySelectorAll<HTMLElement>('.hub-radio input');
    botoes[indice]?.focus();
  }
}
