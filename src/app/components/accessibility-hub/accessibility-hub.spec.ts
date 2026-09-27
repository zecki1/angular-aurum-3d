import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AccessibilityHub } from './accessibility-hub';

describe('AccessibilityHub', () => {
  let fixture: ComponentFixture<AccessibilityHub>;
  let comp: AccessibilityHub;
  let matchMediaOriginal: typeof window.matchMedia;

  const html = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const painel = (): HTMLElement => html().querySelector<HTMLElement>('.hub-acessibilidade')!;
  const gatilho = (): HTMLButtonElement => html().querySelector<HTMLButtonElement>('.hub-botao')!;

  beforeEach(async () => {
    localStorage.clear();
    document.documentElement.className = '';
    document.documentElement.removeAttribute('style');
    // O ChromeHeadless pede movimento reduzido; sem fixar, o estado inicial
    // do switch "Reduzir animações" varia entre teste e ambiente.
    matchMediaOriginal = window.matchMedia;
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: (consulta: string) =>
        ({
          matches: false,
          media: consulta,
          addEventListener: () => undefined,
          removeEventListener: () => undefined,
          onchange: null,
          dispatchEvent: () => false,
        }) as unknown as MediaQueryList,
    });
    await TestBed.configureTestingModule({
      imports: [AccessibilityHub],
    }).compileComponents();
    fixture = TestBed.createComponent(AccessibilityHub);
    comp = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: matchMediaOriginal,
    });
    document.documentElement.className = '';
    document.documentElement.removeAttribute('style');
  });

  it('abre e fecha o hub', () => {
    expect(comp.aberto()).toBeFalse();
    comp.abrir();
    expect(comp.aberto()).toBeTrue();
    comp.fechar();
    expect(comp.aberto()).toBeFalse();
  });

  it('o gatilho alterna o painel', () => {
    gatilho().click();
    fixture.detectChanges();
    expect(comp.aberto()).toBeTrue();
    expect(gatilho().getAttribute('aria-expanded')).toBe('true');

    gatilho().click();
    fixture.detectChanges();
    expect(comp.aberto()).toBeFalse();
  });

  it('esconde o painel fechado da tecnologia assistiva E da ordem de tabulação', () => {
    // Regressão: `aria-hidden` sozinho deixava os 10 controles internos
    // focáveis por Tab (violação `aria-hidden-focus` do axe).
    expect(painel().hasAttribute('inert')).toBeTrue();
    expect(painel().getAttribute('aria-hidden')).toBe('true');

    comp.abrir();
    fixture.detectChanges();

    expect(painel().hasAttribute('inert')).toBeFalse();
    expect(painel().hasAttribute('aria-hidden')).toBeFalse();
  });

  it('é um diálogo rotulado pelo próprio título', () => {
    const titulo = painel().querySelector('#hub-titulo');
    expect(painel().getAttribute('role')).toBe('dialog');
    expect(painel().getAttribute('aria-labelledby')).toBe('hub-titulo');
    expect(titulo?.textContent?.trim()).toBe('Acessibilidade');
  });

  it('o gatilho aponta para o painel que ele controla', () => {
    expect(gatilho().getAttribute('aria-controls')).toBe(painel().id);
    expect(gatilho().getAttribute('aria-haspopup')).toBe('dialog');
    expect(gatilho().getAttribute('aria-expanded')).toBe('false');
  });

  it('Escape fecha o hub e devolve o foco ao gatilho', () => {
    comp.abrir();
    fixture.detectChanges();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();

    expect(comp.aberto()).toBeFalse();
  });

  it('ignora outras teclas e Escape com o hub fechado', () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(comp.aberto()).toBeFalse();

    comp.abrir();
    fixture.detectChanges();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(comp.aberto()).toBeTrue();
  });

  it('clicar fora fecha, clicar dentro mantém aberto', () => {
    comp.abrir();
    fixture.detectChanges();

    comp.aoPonteiro({ target: document.body } as unknown as PointerEvent);
    expect(comp.aberto()).toBeFalse();

    comp.abrir();
    fixture.detectChanges();
    comp.aoPonteiro({ target: painel() } as unknown as PointerEvent);
    expect(comp.aberto()).toBeTrue();

    comp.aoPonteiro({ target: gatilho() } as unknown as PointerEvent);
    expect(comp.aberto()).toBeTrue();
  });

  it('aplica alto contraste pelo switch', () => {
    const raiz = document.documentElement;
    const sw = html().querySelector<HTMLButtonElement>('.hub-toggle')!;

    sw.click();
    fixture.detectChanges();
    expect(raiz.classList.contains('alto-contraste')).toBeTrue();
    expect(comp.a11y.altoContraste()).toBeTrue();
    expect(sw.getAttribute('aria-checked')).toBe('true');
    expect(sw.getAttribute('role')).toBe('switch');
  });

  it('cada switch reflete o estado do seu toggle', () => {
    const sws = html().querySelectorAll<HTMLButtonElement>('.hub-toggle');
    expect(sws.length).toBe(3);

    sws[1].click();
    fixture.detectChanges();
    expect(comp.a11y.linhasGuia()).toBeTrue();
    expect(sws[1].getAttribute('aria-checked')).toBe('true');
    expect(sws[0].getAttribute('aria-checked')).toBe('false');
  });

  it('cada switch tem descrição associada', () => {
    const sws = html().querySelectorAll<HTMLButtonElement>('.hub-toggle');
    for (const sw of sws) {
      const id = sw.getAttribute('aria-describedby')!;
      expect(document.getElementById(id)?.textContent?.trim().length).toBeGreaterThan(0);
    }
  });

  it('o switch de animação avisa quando o sistema já segurou a página', () => {
    // Estado normal: só a descrição do que o botão faz.
    expect(comp.descricaoAlternavel('reduzMovimento')).not.toContain('sistema já pede');

    comp.a11y.sistemaReduzMovimento.set(true);
    fixture.detectChanges();

    // O switch continua desligado (é a preferência salva), mas não mente
    // sobre o que o usuário está vendo.
    expect(comp.descricaoAlternavel('reduzMovimento')).toContain('sistema já pede');
    expect(comp.descricaoAlternavel('altoContraste')).not.toContain('sistema já pede');
  });

  it('exibe a lista de modos de visão num radiogroup', () => {
    const radios = html().querySelectorAll('input[type="radio"]');
    expect(radios.length).toBe(comp.modos.length);

    const grupo = html().querySelector('[role="radiogroup"]');
    expect(grupo?.getAttribute('aria-label')).toBe('Modo de visão');
  });

  it('as setas trocam o modo de visão e movem o roving tabindex', () => {
    const radios = html().querySelectorAll<HTMLInputElement>('input[type="radio"]');
    expect(radios[0].checked).toBeTrue();
    expect(radios[0].tabIndex).toBe(0);
    expect(radios[1].tabIndex).toBe(-1);

    radios[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    fixture.detectChanges();

    expect(comp.a11y.visao()).toBe('monocromatico');
    expect(radios[1].checked).toBeTrue();
    expect(radios[1].tabIndex).toBe(0);
    expect(radios[0].tabIndex).toBe(-1);
  });

  it('as setas dão a volta na lista de modos', () => {
    const radios = html().querySelectorAll<HTMLInputElement>('input[type="radio"]');
    radios[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    fixture.detectChanges();
    expect(comp.a11y.visao()).toBe(comp.modos[comp.modos.length - 1].valor);
  });

  it('Home e End vão às pontas da lista de modos', () => {
    const radios = html().querySelectorAll<HTMLInputElement>('input[type="radio"]');

    radios[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    fixture.detectChanges();
    expect(comp.a11y.visao()).toBe(comp.modos[comp.modos.length - 1].valor);

    radios[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    fixture.detectChanges();
    expect(comp.a11y.visao()).toBe('nenhum');
  });

  it('impede a rolagem nas teclas de navegação do grupo de visão', () => {
    const evento = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true });
    html().querySelectorAll('input[type="radio"]')[0].dispatchEvent(evento);
    expect(evento.defaultPrevented).toBeTrue();
  });

  it('os controles de fonte respeitam os limites', () => {
    const botoes = html().querySelectorAll<HTMLButtonElement>('.hub-fonte-botao');
    const diminuir = botoes[0];
    const aumentar = botoes[1];

    for (let i = 0; i < 20; i++) aumentar.click();
    fixture.detectChanges();
    expect(comp.a11y.tamanhoFonte()).toBe(26);
    expect(aumentar.disabled).toBeTrue();

    for (let i = 0; i < 30; i++) diminuir.click();
    fixture.detectChanges();
    expect(comp.a11y.tamanhoFonte()).toBe(12);
    expect(diminuir.disabled).toBeTrue();
  });

  it('o tamanho do texto é anunciado a cada passo', () => {
    const botoes = html().querySelectorAll<HTMLButtonElement>('.hub-fonte-botao');
    botoes[1].click();
    fixture.detectChanges();
    expect(document.getElementById('aurum-anuncio-polite')?.textContent).toContain('17 pixels');
  });

  it('anuncia o limite quando o tamanho não pode mudar mais', () => {
    comp.a11y.definirFonte(26);
    const polite = document.getElementById('aurum-anuncio-polite')!;
    polite.textContent = 'marca';

    html().querySelectorAll<HTMLButtonElement>('.hub-fonte-botao')[1].click();

    expect(polite.textContent).toContain('tamanho máximo');
  });

  it('redefine todas as preferências de uma vez', () => {
    comp.a11y.definirVisao('tritanopia');
    comp.a11y.alternar('altoContraste');
    comp.a11y.definirFonte(22);
    fixture.detectChanges();

    html().querySelector<HTMLButtonElement>('.hub-restaurar')!.click();
    fixture.detectChanges();

    expect(comp.a11y.visao()).toBe('nenhum');
    expect(comp.a11y.altoContraste()).toBeFalse();
    expect(comp.a11y.linhasGuia()).toBeFalse();
    expect(comp.a11y.reduzMovimento()).toBeFalse();
    expect(comp.a11y.tamanhoFonte()).toBe(16);
    expect(document.getElementById('aurum-anuncio-polite')?.textContent).toContain(
      'redefinidas',
    );
  });
});
