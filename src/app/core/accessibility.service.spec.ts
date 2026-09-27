import { TestBed } from '@angular/core/testing';
import { AccessibilityService, FONTE_PADRAO, LIMITES_FONTE } from './accessibility.service';

describe('AccessibilityService', () => {
  let service: AccessibilityService;
  const raiz = document.documentElement;

  beforeEach(() => {
    localStorage.clear();
    raiz.classList.remove(
      'modo-monocromatico',
      'modo-protanopia',
      'modo-deuteranopia',
      'modo-tritanopia',
      'modo-baixo-contraste',
      'alto-contraste',
      'linhas-guia',
      'reduz-movimento',
    );
    TestBed.configureTestingModule({});
    service = TestBed.inject(AccessibilityService);
  });

  afterEach(() => {
    document.getElementById('aurum-anuncio-polite')?.remove();
    document.getElementById('aurum-anuncio-assertive')?.remove();
  });

  it('deve ser criado e iniciar sem filtros', () => {
    expect(service).toBeTruthy();
    expect(service.visao()).toBe('nenhum');
    expect(service.altoContraste()).toBeFalse();
  });

  it('aplica classe de filtro de visão no <html>', () => {
    service.definirVisao('monocromatico');
    expect(raiz.classList.contains('modo-monocromatico')).toBeTrue();
    service.definirVisao('nenhum');
    expect(raiz.classList.contains('modo-monocromatico')).toBeFalse();
  });

  it('troca a classe de visão sem deixar a anterior no <html>', () => {
    service.definirVisao('protanopia');
    service.definirVisao('tritanopia');
    expect(raiz.classList.contains('modo-protanopia')).toBeFalse();
    expect(raiz.classList.contains('modo-tritanopia')).toBeTrue();
  });

  it('ignora modo de visão desconhecido', () => {
    service.definirVisao('deuteranopia');
    service.definirVisao('inexistente' as never);
    expect(service.visao()).toBe('deuteranopia');
  });

  it('alterna alto contraste', () => {
    service.alternar('altoContraste');
    expect(service.altoContraste()).toBeTrue();
    expect(raiz.classList.contains('alto-contraste')).toBeTrue();
    service.alternar('altoContraste');
    expect(service.altoContraste()).toBeFalse();
  });

  it('alterna linhas-guia e reduz movimento', () => {
    service.alternar('linhasGuia');
    expect(raiz.classList.contains('linhas-guia')).toBeTrue();
    service.alternar('reduzMovimento');
    expect(raiz.classList.contains('reduz-movimento')).toBeTrue();
  });

  it('ignora alternância de preferência desconhecida', () => {
    expect(() => (service.alternar as (nome: string) => void)('desconhecido')).not.toThrow();
    expect(service.altoContraste()).toBeFalse();
  });

  it('ajusta o tamanho da fonte com limites', () => {
    service.aumentarFonte();
    expect(service.tamanhoFonte()).toBe(FONTE_PADRAO + 1);
    service.diminuirFonte();
    expect(service.tamanhoFonte()).toBe(FONTE_PADRAO);
  });

  it('começa no tamanho padrão do navegador, não no mínimo', () => {
    // Regressão: usar `MIN_FONTE` (12) como padrão encolhia toda a tipografia
    // em rem para 75% do tamanho pretendido.
    expect(service.tamanhoFonte()).toBe(16);
    expect(raiz.style.fontSize).toBe('16px');
  });

  it('aplica o tamanho de fonte no <html>', () => {
    service.definirFonte(20);
    expect(raiz.style.fontSize).toBe('20px');
    service.definirFonte(4);
    expect(raiz.style.fontSize).toBe(`${LIMITES_FONTE.min}px`);
    service.definirFonte(99);
    expect(raiz.style.fontSize).toBe(`${LIMITES_FONTE.max}px`);
  });

  it('não regrava quando o tamanho não muda', () => {
    service.definirFonte(18);
    const polite = document.getElementById('aurum-anuncio-polite')!;
    polite.textContent = 'marca';
    service.definirFonte(18);
    expect(polite.textContent).toBe('marca');
  });

  it('anuncia o tamanho da fonte', () => {
    service.aumentarFonte();
    expect(document.getElementById('aurum-anuncio-polite')?.textContent).toContain('17 pixels');
  });

  it('anuncia o limite ao bater no mínimo e no máximo', () => {
    const polite = document.getElementById('aurum-anuncio-polite')!;

    service.definirFonte(LIMITES_FONTE.max);
    polite.textContent = 'marca';
    service.aumentarFonte();
    expect(polite.textContent).toContain('tamanho máximo');

    service.definirFonte(LIMITES_FONTE.min);
    polite.textContent = 'marca';
    service.diminuirFonte();
    expect(polite.textContent).toContain('tamanho mínimo');
  });

  it('anuncia a visão e os toggles alterados', () => {
    service.definirVisao('tritanopia');
    expect(document.getElementById('aurum-anuncio-polite')?.textContent).toContain('Tritanopia');

    service.alternar('altoContraste');
    expect(document.getElementById('aurum-anuncio-polite')?.textContent).toContain(
      'Alto contraste: ativado',
    );
  });

  it('movimentoReduzido une a preferência do sistema e o botão do hub', () => {
    // Não presume o que o ChromeHeadless reporta: o que vale é que o botão
    // liga/desliga e que desligar volta ao que o sistema pediu.
    service.alternar('reduzMovimento');
    expect(service.movimentoReduzido()).toBeTrue();
    expect(raiz.classList.contains('reduz-movimento')).toBeTrue();

    service.alternar('reduzMovimento');
    expect(service.movimentoReduzido()).toBe(service.sistemaReduzMovimento());
    expect(raiz.classList.contains('reduz-movimento')).toBe(service.sistemaReduzMovimento());
  });

  it('segue a media query do sistema', () => {
    // O `matchMedia` real precisa ser substituído *antes* da construção do
    // serviço — o serviço lê a media query no construtor, uma vez só.
    const original = window.matchMedia;
    let sistemaPede = true;
    spyOn(window, 'matchMedia').and.callFake(
      (query: string) =>
        ({
          matches: query.includes('prefers-reduced-motion') ? sistemaPede : false,
          media: query,
          addEventListener: () => undefined,
          removeEventListener: () => undefined,
          onchange: null,
          dispatchEvent: () => false,
        }) as unknown as MediaQueryList,
    );

    TestBed.resetTestingModule();
    const svc = TestBed.inject(AccessibilityService);

    expect(svc.sistemaReduzMovimento()).toBeTrue();
    expect(svc.movimentoReduzido()).toBeTrue();

    // O toggle do hub continua valendo quando o sistema não pede movimento reduzido.
    sistemaPede = false;
    TestBed.resetTestingModule();
    const svc2 = TestBed.inject(AccessibilityService);
    expect(svc2.movimentoReduzido()).toBeFalse();
    svc2.alternar('reduzMovimento');
    expect(svc2.movimentoReduzido()).toBeTrue();

    (window.matchMedia as jasmine.Spy).and.callThrough();
    expect(typeof original).toBe('function');
  });

  it('restaura as preferências padrão', () => {
    service.definirVisao('baixo-contraste');
    service.alternar('altoContraste');
    service.aumentarFonte();
    service.restaurarPreferencias();

    expect(service.visao()).toBe('nenhum');
    expect(service.altoContraste()).toBeFalse();
    expect(service.linhasGuia()).toBeFalse();
    expect(service.tamanhoFonte()).toBe(FONTE_PADRAO);
  });

  it('anuncia a redefinição uma única vez', () => {
    service.definirVisao('baixo-contraste');
    service.alternar('altoContraste');
    const polite = document.getElementById('aurum-anuncio-polite')!;
    polite.textContent = 'marca';

    service.restaurarPreferencias();

    expect(polite.textContent).toContain('redefinidas');
  });

  it('restaura o modo de visão salvo no localStorage', () => {
    localStorage.setItem('zecki1-aurum-visao', 'deuteranopia');
    TestBed.resetTestingModule();
    const svc = TestBed.inject(AccessibilityService);
    expect(svc.visao()).toBe('deuteranopia');
    expect(raiz.classList.contains('modo-deuteranopia')).toBeTrue();
  });

  it('ignora modo de visão salvo inválido', () => {
    localStorage.setItem('zecki1-aurum-visao', 'modo-inexistente');
    TestBed.resetTestingModule();
    const svc = TestBed.inject(AccessibilityService);
    expect(svc.visao()).toBe('nenhum');
  });

  it('descarta tamanho de fonte salvo fora dos limites', () => {
    localStorage.setItem('zecki1-aurum-fonte', '99');
    TestBed.resetTestingModule();
    const svc = TestBed.inject(AccessibilityService);
    expect(svc.tamanhoFonte()).toBe(FONTE_PADRAO);
  });

  it('persiste as preferências escolhidas', () => {
    service.definirVisao('protanopia');
    service.alternar('linhasGuia');
    service.definirFonte(20);

    expect(localStorage.getItem('zecki1-aurum-visao')).toBe('protanopia');
    expect(localStorage.getItem('zecki1-aurum-linhas-guia')).toBe('1');
    expect(localStorage.getItem('zecki1-aurum-fonte')).toBe('20');
  });
});
