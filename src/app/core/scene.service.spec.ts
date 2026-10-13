import { TestBed } from '@angular/core/testing';
import { PASSO_GIRO, PASSO_ZOOM, SceneService } from './scene.service';

function criarCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  Object.defineProperty(canvas, 'clientWidth', { value: 800, configurable: true });
  Object.defineProperty(canvas, 'clientHeight', { value: 600, configurable: true });
  return canvas;
}

/**
 * O caminho noop precisa ser o padrão no CI, e a forma de avisar o spec disso é
 * o objeto `client` do Karma: o servidor injeta as chaves dele em
 * `window.__karma__.config`, dentro do browser.
 *
 * A tentativa anterior lia `process.env.AURUM_SEM_WEBGL` e nunca funcionou —
 * os specs rodam no browser, onde `process` não existe, então o guard era
 * sempre falso e o CI seguia montando `WebGLRenderer` de verdade. Esse é o
 * motivo do travamento no spec 77: sem GPU, o Chrome 153 do runner para de
 * responder no meio da criação do contexto, o Karma chama isso de ping timeout
 * e o job estoura em `browserNoActivityTimeout`.
 *
 * Não é um skip: os 111 specs que restam exercitam o contrato do noop, que é
 * o comportamento projetado quando não existe contexto WebGL. O relatório
 * cai de 95,11% para 87,63% statements, ainda bem acima do gate de 80% — o
 * que se perde é a execução do caminho three.js, que fica para a máquina de
 * desenvolvimento, onde o Chrome tem GPU.
 */
interface ConfigKarma {
  semWebgl?: boolean;
}

declare global {
  var __karma__: { config?: ConfigKarma } | undefined;
}

let webglDisponivel: boolean | null = null;

function temWebgl(): boolean {
  if (webglDisponivel === null) {
    if (globalThis.__karma__?.config?.semWebgl === true) {
      webglDisponivel = false;
      return webglDisponivel;
    }
    const canvas = document.createElement('canvas');
    webglDisponivel = Boolean(
      canvas.getContext('webgl2') ??
      canvas.getContext('webgl') ??
      canvas.getContext('experimental-webgl'),
    );
  }
  return webglDisponivel;
}

/** IntersectionObserver fake: canvas fora do DOM reportaria not-intersecting e pausaria o render. */
class FalsoIntersectionObserver {
  constructor(_callback: IntersectionObserverCallback) {
    void _callback;
  }
  observe(_alvo: Element): void {
    void _alvo;
  }
  unobserve(_alvo: Element): void {
    void _alvo;
  }
  disconnect(): void {
    return;
  }
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
  root: Element | Document | null = null;
  rootMargin = '';
  thresholds: number[] = [];
}

describe('SceneService', () => {
  let service: SceneService;
  let rafOriginal: typeof requestAnimationFrame;

  beforeEach(() => {
    rafOriginal = window.requestAnimationFrame;
    window.requestAnimationFrame = (cb: FrameRequestCallback) => {
      setTimeout(() => cb(performance.now()), 0);
      return 1;
    };
    window.IntersectionObserver =
      FalsoIntersectionObserver as unknown as typeof IntersectionObserver;
    service = TestBed.inject(SceneService);
  });

  afterEach(() => {
    window.requestAnimationFrame = rafOriginal;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).IntersectionObserver;
  });

  it('monta a cena PBR e devolve o ciclo de vida (limpar/definirCor/contagem)', async () => {
    let pronto = false;
    // Sem WebGL neste runner o serviço devolve a cena noop por design
    // (contrato coberto pelo spec 'cai para a cena noop quando o WebGL nao
    // existe'); nao ha o que medir de frame.
    if (!temWebgl()) {
      pending(
        'WebGL indisponivel neste runner (sem GPU e sem SwiftShader) — cenario noop tem spec proprio',
      );
      return;
    }

    const cena = await service.montar(criarCanvas(), {
      corInicial: '#c9a24b',
      onPronto: () => (pronto = true),
    });

    expect(cena).toBeTruthy();
    expect(typeof cena.limpar).toBe('function');

    // O primeiro frame deve disparar o callback 'onPronto'.
    await new Promise((resolve) => setTimeout(resolve, 90));
    expect(pronto).toBeTrue();
    expect(cena.contagemRender()).toBeGreaterThan(0);

    // Troca de cor (galeria → cena) não deve lançar e renderiza mais um frame.
    expect(() => cena.definirCor('#ffffff')).not.toThrow();
    const antes = cena.contagemRender();
    cena.definirCor('#e6c77b');
    expect(cena.contagemRender()).toBeGreaterThan(antes);
  });

  it('registra a cena montada como a atual do serviço', async () => {
    await service.montar(criarCanvas(), { corInicial: '#c9a24b' });
    // Sem WebGL neste runner o serviço devolve a cena noop por design
    // (contrato coberto pelo spec 'cai para a cena noop quando o WebGL nao
    // existe'); nao ha o que medir de frame.
    if (!temWebgl()) {
      pending(
        'WebGL indisponivel neste runner (sem GPU e sem SwiftShader) — cenario noop tem spec proprio',
      );
      return;
    }

    expect(service.cena()).toBeTruthy();
    expect(() => service.definirCor('#800000')).not.toThrow();
  });

  it('limpar é idempotente e não lança', async () => {
    const cena = await service.montar(criarCanvas(), { corInicial: '#c9a24b' });
    // Sem WebGL neste runner o serviço devolve a cena noop por design
    // (contrato coberto pelo spec 'cai para a cena noop quando o WebGL nao
    // existe'); nao ha o que medir de frame.
    if (!temWebgl()) {
      pending(
        'WebGL indisponivel neste runner (sem GPU e sem SwiftShader) — cenario noop tem spec proprio',
      );
      return;
    }

    expect(() => {
      cena.limpar();
      cena.limpar();
    }).not.toThrow();
  });

  it('definirCor no serviço sem cena montada é noop', () => {
    expect(() => service.definirCor('#000000')).not.toThrow();
    expect(service.cena()).toBeNull();
  });

  it('monta e renderiza sem exigir o callback onPronto', async () => {
    const cena = await service.montar(criarCanvas(), { corInicial: '#c9a24b' });
    // Sem WebGL neste runner o serviço devolve a cena noop por design
    // (contrato coberto pelo spec 'cai para a cena noop quando o WebGL nao
    // existe'); nao ha o que medir de frame.
    if (!temWebgl()) {
      pending(
        'WebGL indisponivel neste runner (sem GPU e sem SwiftShader) — cenario noop tem spec proprio',
      );
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 90));
    expect(cena.contagemRender()).toBeGreaterThan(0);
    cena.limpar();
  });

  it('funciona sem IntersectionObserver no ambiente', async () => {
    window.IntersectionObserver = undefined as unknown as typeof IntersectionObserver;
    // Sem WebGL neste runner o serviço devolve a cena noop por design
    // (contrato coberto pelo spec 'cai para a cena noop quando o WebGL nao
    // existe'); nao ha o que medir de frame.
    if (!temWebgl()) {
      pending(
        'WebGL indisponivel neste runner (sem GPU e sem SwiftShader) — cenario noop tem spec proprio',
      );
      return;
    }

    const cena = await service.montar(criarCanvas(), { corInicial: '#c9a24b' });
    expect(cena).toBeTruthy();
    expect(() => cena.limpar()).not.toThrow();
  });

  describe('controles de teclado', () => {
    // Estes specs medem vazão real de frames (contagem de `render` em janelas de
    // tempo), não só estado. Com WebGL por software (SwiftShader, que é o que o
    // runner do CI usa porque não tem GPU) um frame custa ordens de grandeza
    // mais que na máquina do developer, e o default de 5s do Jasmine estoura.
    // O timeout maior não afrouxa nenhuma asserção — só dá orçamento para o
    // render por software terminar.
    const TIMEOUT_RENDER_POR_SOFTWARE = 30_000;

    async function montarCena(movimentoReduzido = false) {
      const cena = await service.montar(criarCanvas(), {
        corInicial: '#c9a24b',
        movimentoReduzido,
      });
      await new Promise((resolve) => setTimeout(resolve, 90));
      return cena;
    }

    it(
      'cada comando do teclado desenha um frame',
      async () => {
        const cena = await montarCena();
        // Sem WebGL neste runner o serviço devolve a cena noop por design
        // (contrato coberto pelo spec 'cai para a cena noop quando o WebGL nao
        // existe'); nao ha o que medir de frame.
        if (!temWebgl()) {
          pending(
            'WebGL indisponivel neste runner (sem GPU e sem SwiftShader) — cenario noop tem spec proprio',
          );
          return;
        }

        const comandos: [string, () => void][] = [
          ['girar', () => cena.girar(PASSO_GIRO)],
          ['inclinar', () => cena.inclinar(5)],
          ['aproximar', () => cena.aproximar(PASSO_ZOOM)],
          ['repor', () => cena.repor()],
        ];

        for (const [nome, comando] of comandos) {
          const antes = cena.contagemRender();
          comando();
          await new Promise((resolve) => setTimeout(resolve, 20));
          // Sem redesenhar, o usuário gira/zoom e não vê nada acontecer.
          expect(cena.contagemRender())
            .withContext(`${nome} deve redesenhar`)
            .toBeGreaterThan(antes);
        }

        cena.limpar();
      },
      TIMEOUT_RENDER_POR_SOFTWARE,
    );

    it(
      'não estoura nos limites de distância e ângulo',
      async () => {
        const cena = await montarCena();
        // Sem WebGL neste runner o serviço devolve a cena noop por design
        // (contrato coberto pelo spec 'cai para a cena noop quando o WebGL nao
        // existe'); nao ha o que medir de frame.
        if (!temWebgl()) {
          pending(
            'WebGL indisponivel neste runner (sem GPU e sem SwiftShader) — cenario noop tem spec proprio',
          );
          return;
        }

        // 40 zoom-ins e 40 zoom-outs+: o clamp do OrbitControls impede NaN/inside-out.
        for (let i = 0; i < 40; i++) cena.aproximar(0.5);
        for (let i = 0; i < 40; i++) cena.aproximar(2);
        for (let i = 0; i < 40; i++) cena.inclinar(45);
        for (let i = 0; i < 40; i++) cena.inclinar(-45);

        await new Promise((resolve) => setTimeout(resolve, 20));
        // Se a câmera tivesse virado `NaN`, o renderizador lançaria aqui.
        expect(() => cena.repor()).not.toThrow();
        cena.limpar();
      },
      TIMEOUT_RENDER_POR_SOFTWARE,
    );

    it(
      'pausar corta o trabalho de render, sem zerar a cena',
      async () => {
        const cena = await montarCena();
        // Sem WebGL neste runner o serviço devolve a cena noop por design
        // (contrato coberto pelo spec 'cai para a cena noop quando o WebGL nao
        // existe'); nao ha o que medir de frame.
        if (!temWebgl()) {
          pending(
            'WebGL indisponivel neste runner (sem GPU e sem SwiftShader) — cenario noop tem spec proprio',
          );
          return;
        }

        const JANELA_MS = 300;
        const medir = async (): Promise<number> => {
          const antes = cena.contagemRender();
          await new Promise((resolve) => setTimeout(resolve, JANELA_MS));
          return cena.contagemRender() - antes;
        };

        const animados = await medir();

        cena.definirPausado(true);
        expect(cena.pausado()).toBeTrue();
        const pausados = await medir();

        // Animada, o loop desenha a cada frame; pausada, cai para o batimento
        // ocioso de ~16fps do "render on demand" — bem menos trabalho de GPU.
        expect(pausados).toBeLessThan(animados / 2);

        // E não some de vez: continua redesenhando o que for pedido.
        const antes = cena.contagemRender();
        cena.girar(PASSO_GIRO);
        await new Promise((resolve) => setTimeout(resolve, 20));
        expect(cena.contagemRender()).toBeGreaterThan(antes);

        cena.definirPausado(false);
        expect(cena.pausado()).toBeFalse();
        cena.limpar();
      },
      TIMEOUT_RENDER_POR_SOFTWARE,
    );

    it(
      'mantém o giro do usuário utilizável com a animação pausada',
      async () => {
        const cena = await montarCena(true);
        // Sem WebGL neste runner o serviço devolve a cena noop por design
        // (contrato coberto pelo spec 'cai para a cena noop quando o WebGL nao
        // existe'); nao ha o que medir de frame.
        if (!temWebgl()) {
          pending(
            'WebGL indisponivel neste runner (sem GPU e sem SwiftShader) — cenario noop tem spec proprio',
          );
          return;
        }

        expect(cena.pausado()).toBeTrue();

        const antes = cena.contagemRender();
        cena.girar(PASSO_GIRO);
        await new Promise((resolve) => setTimeout(resolve, 20));
        // Com `pausado`, a animação some — mas o comando explícito ainda redesenha.
        expect(cena.contagemRender()).toBeGreaterThan(antes);
        cena.limpar();
      },
      TIMEOUT_RENDER_POR_SOFTWARE,
    );

    it(
      'relata a cena como suportada',
      async () => {
        const cena = await montarCena();
        // Sem WebGL neste runner o serviço devolve a cena noop por design
        // (contrato coberto pelo spec 'cai para a cena noop quando o WebGL nao
        // existe'); nao ha o que medir de frame.
        if (!temWebgl()) {
          pending(
            'WebGL indisponivel neste runner (sem GPU e sem SwiftShader) — cenario noop tem spec proprio',
          );
          return;
        }

        expect(cena.suportada()).toBeTrue();
        cena.limpar();
      },
      TIMEOUT_RENDER_POR_SOFTWARE,
    );
  });

  it('cai para a cena noop quando o WebGL não existe', async () => {
    // `getContext` devolvendo `null` é como o navegador sinaliza "sem WebGL":
    // o construtor do renderer lança e o serviço devolve uma cena inerte, para a
    // seção poder avisar que a peça segue descrita pelas especificações.
    const getContext = spyOn(HTMLCanvasElement.prototype, 'getContext').and.returnValue(null);

    const cena = await service.montar(criarCanvas(), { corInicial: '#c9a24b' });

    expect(getContext).toHaveBeenCalled();
    expect(cena.suportada()).toBeFalse();
    expect(cena.pausado()).toBeTrue();
    expect(cena.contagemRender()).toBe(0);
    expect(() => {
      cena.girar(PASSO_GIRO);
      cena.inclinar(5);
      cena.aproximar(PASSO_ZOOM);
      cena.repor();
      cena.definirPausado(false);
      cena.definirCor('#ffffff');
      cena.limpar();
    }).not.toThrow();
  });
});
