import { Injectable, computed, inject, signal } from '@angular/core';
import { AnunciadorService } from './anunciador.service';

/** Modos de filtro visual (padrão dos sites do roadmap). */
export type ModoVisao =
  | 'nenhum'
  | 'monocromatico'
  | 'protanopia'
  | 'deuteranopia'
  | 'tritanopia'
  | 'baixo-contraste';

/** Rótulos em pt-BR de cada modo — usados pelo hub e pelos anúncios. */
export const ROTULO_VISAO: Record<ModoVisao, string> = {
  nenhum: 'Padrão',
  monocromatico: 'Monocromático',
  protanopia: 'Protanopia',
  deuteranopia: 'Deuteranopia',
  tritanopia: 'Tritanopia',
  'baixo-contraste': 'Baixo contraste',
};

const CHAVES = {
  visao: 'zecki1-aurum-visao',
  altoContraste: 'zecki1-aurum-alto-contraste',
  linhasGuia: 'zecki1-aurum-linhas-guia',
  reduzMovimento: 'zecki1-aurum-reduz-movimento',
  tamanhoFonte: 'zecki1-aurum-fonte',
} as const;

const MIN_FONTE = 12;
const MAX_FONTE = 26;
const PASSO_FONTE = 1;
/** Tamanho padrão do navegador. Precisa ser ≠ `MIN_FONTE`: usar 12 como padrão
 *  encolhia toda a tipografia em rem para 75% do tamanho pretendido. */
export const FONTE_PADRAO = 16;

/** Limites do controle de tamanho de fonte. */
export const LIMITES_FONTE = {
  min: MIN_FONTE,
  max: MAX_FONTE,
  passo: PASSO_FONTE,
  padrao: FONTE_PADRAO,
} as const;

/** Classe `.modo-*` aplicada no `<html>` para cada modo de visão. */
const CLASSE_VISAO: Record<ModoVisao, string> = {
  nenhum: '',
  monocromatico: 'modo-monocromatico',
  protanopia: 'modo-protanopia',
  deuteranopia: 'modo-deuteranopia',
  tritanopia: 'modo-tritanopia',
  'baixo-contraste': 'modo-baixo-contraste',
};

const MODOS_VALIDOS: ModoVisao[] = [
  'nenhum',
  'monocromatico',
  'protanopia',
  'deuteranopia',
  'tritanopia',
  'baixo-contraste',
];

interface EstadoToggle {
  chave: keyof typeof CHAVES;
  sinal: ReturnType<typeof signal<boolean>>;
  classe: string;
  /** Rótulo em pt-BR usado nos anúncios da live region. */
  rotulo: string;
}

/** Query que expõe a preferência de movimento do sistema. */
export const QUERY_REDUZ_MOVIMENTO = '(prefers-reduced-motion: reduce)';

@Injectable({ providedIn: 'root' })
export class AccessibilityService {
  private readonly anunciador = inject(AnunciadorService);

  readonly visao = signal<ModoVisao>(this.lerVisao());
  readonly altoContraste = signal(this.lerBool('altoContraste'));
  readonly linhasGuia = signal(this.lerBool('linhasGuia'));
  readonly reduzMovimento = signal(this.lerBool('reduzMovimento'));
  readonly tamanhoFonte = signal(this.lerNumero('tamanhoFonte', FONTE_PADRAO));

  /**
   * Verdadeiro quando o movimento deve ser cortado — tanto pela preferência do
   * sistema quanto pelo botão do hub. É este sinal que o JS (gsap, three.js)
   * consulta: o CSS sozinho não impede `requestAnimationFrame` nem tweens.
   */
  readonly movimentoReduzido = computed(
    () => this.reduzMovimento() || this.sistemaReduzMovimento(),
  );

  /**
   * Espelho da media query em signal, para o template/JS reagirem à mudança
   * feita nas configurações do sistema durante a sessão.
   */
  readonly sistemaReduzMovimento = signal(false);

  private readonly toggles: Record<string, EstadoToggle> = {
    altoContraste: {
      chave: 'altoContraste',
      sinal: this.altoContraste,
      classe: 'alto-contraste',
      rotulo: 'Alto contraste',
    },
    linhasGuia: {
      chave: 'linhasGuia',
      sinal: this.linhasGuia,
      classe: 'linhas-guia',
      rotulo: 'Linhas-guia de leitura',
    },
    reduzMovimento: {
      chave: 'reduzMovimento',
      sinal: this.reduzMovimento,
      classe: 'reduz-movimento',
      rotulo: 'Reduzir animações',
    },
  };

  constructor() {
    this.observarPreferenciaSistema();
    this.aplicarNoDom();
  }

  definirVisao(modo: ModoVisao): void {
    if (!MODOS_VALIDOS.includes(modo)) return;
    this.visao.set(modo);
    this.gravar('visao', modo);
    this.sincronizarClasseVisao();
    this.anunciador.anunciar(`Visão: ${ROTULO_VISAO[modo]}`);
  }

  alternar(nome: 'altoContraste' | 'linhasGuia' | 'reduzMovimento'): void {
    const t = this.toggles[nome];
    if (!t) return;
    const novo = !t.sinal();
    t.sinal.set(novo);
    this.gravarBool(t.chave, novo);
    this.aplicarClasse(t.classe, novo);
    this.anunciador.anunciar(`${t.rotulo}: ${novo ? 'ativado' : 'desativado'}`);
  }

  aumentarFonte(): void {
    this.ajustarFonte(PASSO_FONTE);
  }

  diminuirFonte(): void {
    this.ajustarFonte(-PASSO_FONTE);
  }

  definirFonte(valor: number): void {
    const prox = Math.min(MAX_FONTE, Math.max(MIN_FONTE, Math.round(valor)));
    if (prox === this.tamanhoFonte()) return;
    this.tamanhoFonte.set(prox);
    this.gravarNumero('tamanhoFonte', prox);
    document.documentElement.style.fontSize = `${prox}px`;
    this.anunciarFonte(prox);
  }

  restaurarPreferencias(): void {
    // Um único anúncio no fim: quatro avisos em fila irritam mais do que ajudam.
    this.visao.set('nenhum');
    this.gravar('visao', 'nenhum');
    this.sincronizarClasseVisao();
    this.definirToggle('altoContraste', false, true);
    this.definirToggle('linhasGuia', false, true);
    this.definirToggle('reduzMovimento', false, true);
    this.definirFonte(FONTE_PADRAO);
    this.anunciador.anunciar('Preferências de acessibilidade redefinidas');
  }

  private definirToggle(
    nome: 'altoContraste' | 'linhasGuia' | 'reduzMovimento',
    valor: boolean,
    silencioso = false,
  ): void {
    const t = this.toggles[nome];
    if (!t) return;
    t.sinal.set(valor);
    this.gravarBool(t.chave, valor);
    this.aplicarClasse(t.classe, valor);
    if (!silencioso) this.anunciador.anunciar(`${t.rotulo}: ${valor ? 'ativado' : 'desativado'}`);
  }

  private aplicarNoDom(): void {
    const raiz = document.documentElement;
    raiz.classList.remove(...Object.values(CLASSE_VISAO).filter(Boolean));
    this.sincronizarClasseVisao();
    for (const t of Object.values(this.toggles)) {
      this.aplicarClasse(t.classe, t.sinal());
    }
    raiz.style.fontSize = `${this.tamanhoFonte()}px`;
  }

  private ajustarFonte(delta: number): void {
    const prox = Math.min(MAX_FONTE, Math.max(MIN_FONTE, this.tamanhoFonte() + delta));
    if (prox === this.tamanhoFonte()) {
      this.anunciarFonte(prox, true);
      return;
    }
    this.tamanhoFonte.set(prox);
    this.gravarNumero('tamanhoFonte', prox);
    document.documentElement.style.fontSize = `${prox}px`;
    this.anunciarFonte(prox);
  }

  /** Anuncia o tamanho — `noLimite` explica por que o valor não mudou. */
  private anunciarFonte(px: number, noLimite = false): void {
    const sufixo = noLimite
      ? px === MIN_FONTE
        ? ' (tamanho mínimo)'
        : ' (tamanho máximo)'
      : '';
    this.anunciador.anunciar(`Fonte: ${px} pixels${sufixo}`);
  }

  /**
   * Acompanha `prefers-reduced-motion`. Só define o signal — a classe
   * `.reduz-movimento` continua sendo do botão do hub (a preferência salva).
   */
  private observarPreferenciaSistema(): void {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia(QUERY_REDUZ_MOVIMENTO);
    this.sistemaReduzMovimento.set(mq.matches);
    // Só `addEventListener`: o `addListener` legado foi removido dos navegadores
    // atuais e não vale a pena carregá-lo. Sem suporte, vale o valor da leitura.
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', (e) => this.sistemaReduzMovimento.set(e.matches));
    }
  }

  private sincronizarClasseVisao(): void {
    const raiz = document.documentElement;
    raiz.classList.remove(...Object.values(CLASSE_VISAO).filter(Boolean));
    const classe = CLASSE_VISAO[this.visao()];
    if (classe) raiz.classList.add(classe);
  }

  private aplicarClasse(classe: string, ativo: boolean): void {
    if (!classe) return;
    document.documentElement.classList.toggle(classe, ativo);
  }

  private lerVisao(): ModoVisao {
    const v = localStorage.getItem(CHAVES.visao);
    return v && (MODOS_VALIDOS as string[]).includes(v) ? (v as ModoVisao) : 'nenhum';
  }

  private lerBool(chave: keyof typeof CHAVES): boolean {
    return localStorage.getItem(CHAVES[chave]) === '1';
  }

  private lerNumero(chave: keyof typeof CHAVES, padrao: number): number {
    const cru = localStorage.getItem(CHAVES[chave]);
    if (cru === null) return padrao;
    const n = Number(cru);
    return Number.isFinite(n) && n >= MIN_FONTE && n <= MAX_FONTE ? n : padrao;
  }

  private gravar(chave: keyof typeof CHAVES, valor: unknown): void {
    localStorage.setItem(CHAVES[chave], String(valor));
  }

  private gravarBool(chave: keyof typeof CHAVES, valor: boolean): void {
    localStorage.setItem(CHAVES[chave], valor ? '1' : '0');
  }

  private gravarNumero(chave: keyof typeof CHAVES, valor: number): void {
    localStorage.setItem(CHAVES[chave], String(valor));
  }
}