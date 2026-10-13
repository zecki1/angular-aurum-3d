import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProductScene } from './product-scene';
import { CenaMontada, PASSO_GIRO, SceneService } from '../../core/scene.service';

function criarCenaFake(): jasmine.SpyObj<CenaMontada> {
  return jasmine.createSpyObj<CenaMontada>('cena', [
    'limpar',
    'definirCor',
    'contagemRender',
    'girar',
    'inclinar',
    'aproximar',
    'repor',
    'definirPausado',
    'pausado',
    'suportada',
  ]);
}

async function montarFixture(): Promise<ComponentFixture<ProductScene>> {
  const fixture = TestBed.createComponent(ProductScene);
  fixture.detectChanges();
  await new Promise((resolve) => setTimeout(resolve, 0));
  fixture.detectChanges();
  return fixture;
}

describe('ProductScene', () => {
  let cenaFake: jasmine.SpyObj<CenaMontada>;
  let sceneStub: { montar: jasmine.Spy; definirCor: jasmine.Spy; cena: () => CenaMontada | null };
  let matchMediaOriginal: typeof window.matchMedia;

  beforeEach(async () => {
    // Preferências são persistidas em `localStorage`, que é compartilhado por
    // todas as suítes do Karma: sem limpar, o hub de outro spec vira "ligado".
    localStorage.clear();
    // O ChromeHeadless reporta `prefers-reduced-motion: reduce`; sem fixar, a
    // cena nasceria pausada e os testes de pausa dependeriam do ambiente.
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

    cenaFake = criarCenaFake();
    cenaFake.contagemRender.and.returnValue(3);
    cenaFake.suportada.and.returnValue(true);
    cenaFake.pausado.and.returnValue(false);

    sceneStub = {
      montar: jasmine
        .createSpy('montar')
        .and.callFake((_canvas: unknown, opcoes: { onPronto?: () => void }) => {
          opcoes?.onPronto?.();
          return Promise.resolve(cenaFake);
        }),
      definirCor: jasmine.createSpy('definirCor'),
      cena: () => cenaFake,
    };
    await TestBed.configureTestingModule({
      imports: [ProductScene],
      providers: [{ provide: SceneService, useValue: sceneStub }],
    }).compileComponents();
  });

  afterEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: matchMediaOriginal,
    });
    document.getElementById('aurum-anuncio-polite')?.remove();
    document.getElementById('aurum-anuncio-assertive')?.remove();
  });

  it('inicia com o estado de loading e sai ao montar a cena', async () => {
    const fixture = await montarFixture();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(fixture.componentInstance.pronto()).toBeTrue();
    expect(sceneStub.montar).toHaveBeenCalled();
    expect(compiled.querySelector('.cena-loading')).toBeFalsy();
    expect(compiled.querySelector('.cena canvas')).toBeTruthy();

    fixture.destroy();
  });

  it('mantém o loading enquanto a cena não renderiza', () => {
    sceneStub.montar.and.callFake(() => Promise.resolve(cenaFake));
    const fixture = TestBed.createComponent(ProductScene);
    const compiled = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();

    expect(fixture.componentInstance.pronto()).toBeFalse();
    expect(compiled.querySelector('.cena-loading')).toBeTruthy();

    fixture.destroy();
  });

  it('libera a cena ao destruir o componente (dispose)', async () => {
    const fixture = await montarFixture();
    fixture.destroy();
    expect(cenaFake.limpar).toHaveBeenCalled();
  });

  it('sincroniza a cor selecionada para a cena', async () => {
    const fixture = await montarFixture();
    expect(sceneStub.definirCor).toHaveBeenCalledWith('#c9a24b');
    fixture.destroy();
  });

  it('formata preço em BRL', () => {
    const fixture = TestBed.createComponent(ProductScene);
    expect(fixture.componentInstance.preco(18500)).toContain('18.500');
    expect(fixture.componentInstance.preco(18500)).toContain('R$');
    fixture.destroy();
  });

  it('limpa a cena se o componente for destruído antes do mount', async () => {
    let resolverCena!: (cena: CenaMontada) => void;
    sceneStub.montar.and.callFake(
      (canvas: unknown) => {
        void canvas;
        return new Promise<CenaMontada>((resolve) => {
          resolverCena = resolve;
        });
      },
    );

    const fixture = TestBed.createComponent(ProductScene);
    fixture.detectChanges();
    expect(sceneStub.montar).toHaveBeenCalled();

    fixture.destroy();
    resolverCena(cenaFake);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(cenaFake.limpar).toHaveBeenCalled();
  });

  describe('cena acessível', () => {
    it('dá nome acessível e descrição ao canvas', async () => {
      const fixture = await montarFixture();
      const canvas = (fixture.nativeElement as HTMLElement).querySelector('canvas')!;

      // Sem isto, a peça — o conteúdo principal — sumia para leitor de tela.
      expect(canvas.getAttribute('role')).toBe('img');
      expect(canvas.getAttribute('aria-label')).toContain('Aurum Nº 1');
      expect(canvas.getAttribute('aria-label')).toContain('Ouro 18k');
      expect(canvas.getAttribute('tabindex')).toBe('0');

      const descrito = canvas.getAttribute('aria-describedby')!.split(' ');
      for (const id of descrito) {
        expect(document.getElementById(id)?.textContent?.trim().length).toBeGreaterThan(0);
      }
      fixture.destroy();
    });

    it('as instruções de teclado citam setas, zoom e Home', async () => {
      const fixture = await montarFixture();
      const texto = fixture.componentInstance.instrucoesCena.toLowerCase();
      expect(texto).toContain('setas');
      expect(texto).toContain('mais');
      expect(texto).toContain('home');
      fixture.destroy();
    });

    it('traduz as setas em giro e inclinação da peça', async () => {
      const fixture = await montarFixture();
      const comp = fixture.componentInstance;

      expect(comp.aoTecla(new KeyboardEvent('keydown', { key: 'ArrowRight' }))).toBeTrue();
      expect(cenaFake.girar).toHaveBeenCalledWith(PASSO_GIRO);

      comp.aoTecla(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
      expect(cenaFake.girar).toHaveBeenCalledWith(-PASSO_GIRO);

      comp.aoTecla(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
      expect(cenaFake.inclinar).toHaveBeenCalled();

      comp.aoTecla(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
      expect(cenaFake.inclinar).toHaveBeenCalledTimes(2);
      fixture.destroy();
    });

    it('trata + e - como zoom e Home como reposicionamento', async () => {
      const fixture = await montarFixture();
      const comp = fixture.componentInstance;

      comp.aoTecla(new KeyboardEvent('keydown', { key: '+' }));
      comp.aoTecla(new KeyboardEvent('keydown', { key: '=' }));
      expect(cenaFake.aproximar).toHaveBeenCalledTimes(2);

      comp.aoTecla(new KeyboardEvent('keydown', { key: '-' }));
      expect(cenaFake.aproximar).toHaveBeenCalledTimes(3);

      comp.aoTecla(new KeyboardEvent('keydown', { key: 'Home' }));
      expect(cenaFake.repor).toHaveBeenCalled();
      fixture.destroy();
    });

    it('ignora teclas fora do mapa e não impede a rolagem', async () => {
      const fixture = await montarFixture();
      const evento = new KeyboardEvent('keydown', { key: 'PageDown', cancelable: true });

      expect(fixture.componentInstance.aoTecla(evento)).toBeFalse();
      expect(evento.defaultPrevented).toBeFalse();
      fixture.destroy();
    });

    it('pausa e retoma a animação pelo botão', async () => {
      const fixture = await montarFixture();
      const comp = fixture.componentInstance;
      const botao = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.cena-pausa')!;

      expect(botao.getAttribute('aria-pressed')).toBe('false');

      botao.click();
      fixture.detectChanges();
      expect(comp.pausado()).toBeTrue();
      expect(cenaFake.definirPausado).toHaveBeenCalledWith(true);
      expect(botao.getAttribute('aria-pressed')).toBe('true');
      expect(botao.textContent).toContain('Retomar');

      botao.click();
      fixture.detectChanges();
      expect(comp.pausado()).toBeFalse();
      expect(document.getElementById('aurum-anuncio-polite')?.textContent).toContain('retomada');
      fixture.destroy();
    });

    it('mantém a cena parada quando o movimento está reduzido', async () => {
      const cenaReduzida = criarCenaFake();
      cenaReduzida.suportada.and.returnValue(true);
      sceneStub.montar.and.callFake(
        (_canvas: unknown, opcoes: { onPronto?: () => void; movimentoReduzido?: boolean }) => {
          expect(opcoes.movimentoReduzido).toBeTrue();
          opcoes?.onPronto?.();
          return Promise.resolve(cenaReduzida);
        },
      );

      const { AccessibilityService } = await import('../../core/accessibility.service');
      const a11y = TestBed.inject(AccessibilityService);
      a11y.alternar('reduzMovimento');

      const fixture = TestBed.createComponent(ProductScene);
      fixture.detectChanges();
      await new Promise((resolve) => setTimeout(resolve, 0));
      fixture.detectChanges();

      expect(cenaReduzida.definirPausado).toHaveBeenCalledWith(true);
      fixture.destroy();
    });

    it('o botão reflete a pausa pedida pelo sistema, não um estado paralelo', async () => {
      const { AccessibilityService } = await import('../../core/accessibility.service');
      const a11y = TestBed.inject(AccessibilityService);
      a11y.alternar('reduzMovimento');

      const fixture = await montarFixture();
      const comp = fixture.componentInstance;
      const botao = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
        '.cena-pausa',
      )!;

      // `aria-pressed` precisa concordar com a cena de verdade.
      expect(comp.pausado()).toBeTrue();
      expect(botao.getAttribute('aria-pressed')).toBe('true');
      expect(botao.textContent).toContain('Retomar');
      fixture.destroy();
    });

    it('deixa o usuário religar a animação que o sistema had pausado', async () => {
      const { AccessibilityService } = await import('../../core/accessibility.service');
      const a11y = TestBed.inject(AccessibilityService);
      a11y.alternar('reduzMovimento');

      const fixture = await montarFixture();
      const comp = fixture.componentInstance;

      comp.alternarPausa();
      expect(comp.pausado()).toBeFalse();
      expect(cenaFake.definirPausado).toHaveBeenCalledWith(false);
      expect(document.getElementById('aurum-anuncio-polite')?.textContent).toContain('retomada');
      fixture.destroy();
    });

    it('avisa que a peça segue descrita quando não há WebGL', async () => {
      const cenaSemWebgl = criarCenaFake();
      cenaSemWebgl.suportada.and.returnValue(false);
      sceneStub.montar.and.callFake((_canvas: unknown, opcoes: { onPronto?: () => void }) => {
        opcoes?.onPronto?.();
        return Promise.resolve(cenaSemWebgl);
      });

      const fixture = await montarFixture();
      const compiled = fixture.nativeElement as HTMLElement;

      expect(fixture.componentInstance.cenaSuportada()).toBeFalse();
      expect(compiled.querySelector('.cena-sem-webgl')).toBeTruthy();
      // As especificações continuam sendo a alternativa textual completa.
      expect(fixture.componentInstance.descricaoCena()).toContain('Aurum Nº 1');
      fixture.destroy();
    });
  });
});
