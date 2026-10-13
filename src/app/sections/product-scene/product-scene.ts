import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { AccessibilityService } from '../../core/accessibility.service';
import { AnunciadorService } from '../../core/anunciador.service';
import { PASSO_GIRO, PASSO_ZOOM, CenaMontada, SceneService } from '../../core/scene.service';
import { ProductsService } from '../../core/products.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  selector: 'app-product-scene',
  styleUrl: './product-scene.css',
  templateUrl: './product-scene.html',
})
export class ProductScene {
  private readonly produtos = inject(ProductsService);
  private readonly sceneService = inject(SceneService);
  private readonly a11y = inject(AccessibilityService);
  private readonly anunciador = inject(AnunciadorService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('cenaCanvas');

  readonly pronto = signal(false);
  readonly selecionado = this.produtos.selecionado;
  /**
   * Pausa da animação — fonte única de verdade (WCAG 2.2.2, parar movimento
   * contínuo). Nasce do que o sistema pede, para o botão refletir a realidade:
   * `aria-pressed` mentindo é pior que não ter botão.
   */
  readonly pausado = signal(false);
  /** `false` quando o navegador não tem WebGL: a UI anuncia o modo texto. */
  readonly cenaSuportada = signal(true);

  /** Nome acessível do canvas: o que a peça é, em pt-BR. */
  readonly descricaoCena = computed(
    () =>
      `Peça em três dimensões: ${this.selecionado().nome}, ${this.selecionado().metal}, ` +
      `acabamento ${this.selecionado().acabamento.toLowerCase()}.`,
  );

  private destruido = false;
  private cena: CenaMontada | null = null;

  /** Formata o preço em BRL (ex.: R$ 18.500,00). */
  preco(valor: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
  }

  /** Texto das instruções de teclado, exibido e lido por leitores de tela. */
  readonly instrucoesCena =
    'Use as setas para girar e inclinar a peça, sinal de mais e menos para aproximar ' +
    'ou afastar, e Home para voltar ao enquadramento inicial.';

  constructor() {
    this.destroyRef.onDestroy(() => (this.destruido = true));

    // A preferência do sistema é o estado inicial; o botão do hub continua
    // mandando depois (a partir dali é decisão do usuário).
    this.pausado.set(this.a11y.movimentoReduzido());

    effect(() => {
      this.sceneService.definirCor(this.selecionado().cor);
    });

    // `movimentoReduzido` combina a preferência do sistema com o botão do hub:
    // cortando o sinal, a cena para de girar sozinha.
    effect(() => {
      const reduzido = this.a11y.movimentoReduzido();
      this.pausado.set(reduzido);
      this.cena?.definirPausado(reduzido);
    });

    afterNextRender({
      write: () => {
        void this.montarCena();
      },
    });
  }

  /**
   * Alterna a pausa da animação (botão visível sob o canvas).
   * Um clique do usuário pode religar a animação mesmo com o sistema pedindo
   * movimento reduzido: pedir menos movimento é o *padrão*, não uma proibição.
   */
  alternarPausa(): void {
    if (!this.cena?.suportada()) return;
    const novo = !this.pausado();
    this.pausado.set(novo);
    this.cena.definirPausado(novo);
    this.anunciador.anunciar(
      novo
        ? 'Animação da cena pausada. A peça continua interativa pelo teclado.'
        : 'Animação da cena retomada.',
    );
  }

  /**
   * Teclado como alternativa ao arrasto do OrbitControls (que é só ponteiro).
   * Devolve `true` quando tratou a tecla, para o componente não cortar a página.
   */
  aoTecla(event: KeyboardEvent): boolean {
    const cena = this.cena;
    if (!cena?.suportada()) return false;

    switch (event.key) {
      case 'ArrowLeft':
        cena.girar(-PASSO_GIRO);
        break;
      case 'ArrowRight':
        cena.girar(PASSO_GIRO);
        break;
      case 'ArrowUp':
        cena.inclinar(-PASSO_GIRO);
        break;
      case 'ArrowDown':
        cena.inclinar(PASSO_GIRO);
        break;
      case '+':
      case '=':
        cena.aproximar(PASSO_ZOOM);
        break;
      case '-':
      case '_':
        cena.aproximar(1 / PASSO_ZOOM);
        break;
      case 'Home':
        cena.repor();
        break;
      default:
        return false;
    }

    event.preventDefault();
    return true;
  }

  private async montarCena(): Promise<void> {
    const canvas = this.canvas()?.nativeElement;
    if (!canvas) return;
    const cena = await this.sceneService.montar(canvas, {
      corInicial: this.selecionado().cor,
      movimentoReduzido: this.pausado(),
      onPronto: () => this.pronto.set(true),
    });
    if (this.destruido) {
      cena.limpar();
      return;
    }
    this.cena = cena;
    this.cenaSuportada.set(cena.suportada());
    this.destroyRef.onDestroy(() => cena.limpar());
    // Sincroniza com a seleção atual mesmo se o usuário escolheu antes do mount.
    this.sceneService.definirCor(this.selecionado().cor);
    cena.definirPausado(this.pausado());
  }
}
