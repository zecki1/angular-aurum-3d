import { Injectable } from '@angular/core';
import type { TipoPeca } from './jewelry/pecas';

const cacheModelos = new Map<string, unknown>();

export interface OpcoesCena {
  /** Cor PBR (hex) do material metálico principal. */
  corInicial: string;
  /** Peça montada no primeiro frame (padrão: anel solitaire). */
  tipoPeca?: TipoPeca;
  /** Cor da pedra central (hex). Padrão: diamante. */
  corGema?: string;
  /** Caminho do modelo GLTF/GLB a carregar (ex.: /models/doji-ring.glb). Se presente, sobrepõe a peça procedural. */
  modelo?: string;
  /** Chamado no primeiro frame renderizado (para sair do estado de loading). */
  onPronto?: () => void;
  /**
   * Corta a animação contínua (rotação + órbitas) — usado quando o sistema ou o
   * usuário pede `prefers-reduced-motion`, e pelo botão "pausar cena".
   */
  movimentoReduzido?: boolean;
}

export interface CenaMontada {
  /** Libera renderer, controles, geometrias, materiais e listeners. */
  limpar(): void;
  /** Troca a cor do material principal (galeria → cena). */
  definirCor(hex: string): void;
  /** Troca a peça exibida (anel, colar, brinco, pulseira, relógio) e a pedra. */
  definirPeca(tipo: TipoPeca, corGema: string, modelo?: string): void;
  /** Nº de frames desenhados (para medir "render on demand" em teste). */
  contagemRender(): number;
  /** Gira a peça no eixo Y (acionado pelas setas ←/→ do teclado). */
  girar(deltaGraus: number): void;
  /** Inclina a câmera no eixo X, respeitando os limites do OrbitControls. */
  inclinar(deltaGraus: number): void;
  /** Aproxima (+) ou afasta (−) a câmera, respeitando min/maxDistance. */
  aproximar(fator: number): void;
  /** Reposiciona a câmera no enquadramento inicial. */
  repor(): void;
  /** Liga/desliga a animação contínua. `true` = cena parada (WCAG 2.2.2). */
  definirPausado(pausado: boolean): void;
  /** Pausado no momento? */
  pausado(): boolean;
  /** A cena está rodando? `false` quando o WebGL não existe (fallback noop). */
  suportada(): boolean;
}

/** Graus por tecla pressionada — passo que gira sem dizziness. */
export const PASSO_GIRO = 15;
/** Fator de zoom por tecla pressionada. */
export const PASSO_ZOOM = 0.9;


/** Cena "noop" usada quando o WebGL não está disponível no ambiente. */
function noopCena(): CenaMontada {
  return {
    limpar(): void {
      return;
    },
    definirCor(): void {
      return;
    },
    definirPeca(): void {
      return;
    },
    contagemRender(): number {
      return 0;
    },
    girar(): void {
      return;
    },
    inclinar(): void {
      return;
    },
    aproximar(): void {
      return;
    },
    repor(): void {
      return;
    },
    definirPausado(): void {
      return;
    },
    pausado(): boolean {
      return true;
    },
    suportada(): boolean {
      return false;
    },
  };
}

/** Frequência mínima de render no modo ocioso — o "render on demand" no README. */
const INTERVALO_IDLE_MS = 60;
/** Fator de escala do DPR (cap — evita overdraw em telas 3x). */
const LIMITE_DPR = 2;
/** Cor dourada padrão usada quando a cena monta fora da seção de galeria. */
export const COR_PADRAO = '#d4af7a';

/**
 * Monta a cena three.js de ourivesaria — assets 100% procedurais, materiais PBR.
 *
 * Perf (destaque da entrevista):
 * - three.js + addons carregados via `import()` dinâmico → chunk Lazy no bundle.
 * - Render on demand: no modo ocioso desenha em ~16fps; durante interação, frame a frame.
 * - Pausa via IntersectionObserver quando a cena sai da viewport; pula frames com a aba oculta.
 * - DPR limitado a 2x e `dispose()` completo (geometrias/materiais/controles/renderer).
 */
@Injectable({ providedIn: 'root' })
export class SceneService {
  private cenaAtual: CenaMontada | null = null;

  /** Cena montada mais recente (para interações como troca de cor). */
  cena(): CenaMontada | null {
    return this.cenaAtual;
  }

  /** Troca a cor PBR do produto exibido (usado pela galeria). */
  definirCor(hex: string): void {
    this.cenaAtual?.definirCor(hex);
  }

  /** Troca a peça montada (anel, colar, brinco, pulseira, relógio) e a pedra. */
  definirPeca(tipo: TipoPeca, corGema: string, modelo?: string): void {
    this.cenaAtual?.definirPeca(tipo, corGema, modelo);
  }

  async montar(canvas: HTMLCanvasElement, opcoes: OpcoesCena): Promise<CenaMontada> {
    const {
      Scene,
      PerspectiveCamera,
      WebGLRenderer,
      Mesh,
      TorusGeometry,
      CircleGeometry,
      IcosahedronGeometry,
      AmbientLight,
      DirectionalLight,
      PointLight,
      HemisphereLight,
      Group,
      Vector3,
      Box3,
      Spherical,
      ACESFilmicToneMapping,
      PMREMGenerator,
    } = await import('three');
    const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');
    const { RoomEnvironment } = await import('three/examples/jsm/environments/RoomEnvironment.js');

    const largura = Math.max(canvas.clientWidth, 1);
    const altura = Math.max(canvas.clientHeight, 1);

    const cena = new Scene();

    const GRAU = Math.PI / 180;

    const camera = new PerspectiveCamera(38, largura / altura, 0.1, 100);

    let renderizador: InstanceType<typeof WebGLRenderer>;
    try {
      renderizador = new WebGLRenderer({ canvas, alpha: true, antialias: true });
    } catch {
      return noopCena();
    }
    renderizador.setSize(largura, altura);
    renderizador.setPixelRatio(Math.min(window.devicePixelRatio, LIMITE_DPR));
    renderizador.toneMapping = ACESFilmicToneMapping;
    renderizador.toneMappingExposure = 1.18;

    // Ambiente procedural (RoomEnvironment) — metais e diamante precisam de
    // reflection map para "brilhar" sem custo de HDR externo.
    const geradorAmbiente = new PMREMGenerator(renderizador);
    const ambiente = new RoomEnvironment();
    cena.environment = geradorAmbiente.fromScene(ambiente, 0.04).texture;
    geradorAmbiente.dispose();
    ambiente.dispose();

    cena.add(new AmbientLight(0xffffff, 0.5));
    const sol = new DirectionalLight(0xfff0d6, 2.6);
    sol.position.set(4, 7, 5);
    cena.add(sol);
    const contraluz = new PointLight(0xffd9a0, 26, 12, 2);
    contraluz.position.set(-3.2, 2.4, -2.4);
    cena.add(contraluz);
    cena.add(new HemisphereLight(0xfff4e2, 0x120f0b, 0.8));

    const { construirPeca, criarMateriais } = await import('./jewelry/pecas');

    const materiais = criarMateriais({
      metal: opcoes.corInicial,
      gema: opcoes.corGema ?? '#1b3fa0',
    });

    // Peça, poeira de diamante e aro de ouro no chão vivem no mesmo grupo que
    // gira — trocar a peça não mexe em câmera, luz nem controles.
    const grupo = new Group();
    cena.add(grupo);

    const conteudo = new Group();
    grupo.add(conteudo);

    // Enquadramento inicial — `repor()` volta para cá (tecla Home).
    const posicaoInicial = new Vector3();
    const alvoInicial = new Vector3();

    const carregarModelo = async (url: string): Promise<unknown> => {
      if (cacheModelos.has(url)) return cacheModelos.get(url);
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      const { DRACOLoader } = await import('three/examples/jsm/loaders/DRACOLoader.js');
      const carregador = new GLTFLoader();
      const draco = new DRACOLoader();
      draco.setDecoderPath('/draco/');
      carregador.setDRACOLoader(draco);
      const gltf = await new Promise<unknown>((resolve, reject) => {
        carregador.load(url, resolve as (g: unknown) => void, undefined, reject);
      });
      cacheModelos.set(url, gltf);
      return gltf;
    };

    /** Monta a peça pedida e guarda o enquadramento dela. */
    const aplicarPeca = async (tipo: TipoPeca, corGema: string, modelo?: string): Promise<void> => {
      for (const filho of [...conteudo.children]) {
        filho.removeFromParent();
        limparGeometrias(filho);
      }
      materiais.gema.color.set(corGema);

      if (modelo) {
        const gltf = (await carregarModelo(modelo)) as { scene: { clone: (deep?: boolean) => InstanceType<typeof Group> } };
        const raiz = gltf.scene.clone(true);
        // Centraliza e escala para ~2,4 unidades, mantendo proporção.
        const caixa = new Box3().setFromObject(raiz);
        const tamanho = caixa.getSize(new Vector3());
        const centro = caixa.getCenter(new Vector3());
        const maior = Math.max(tamanho.x, tamanho.y, tamanho.z) || 1;
        const escala = 2.4 / maior;
        raiz.scale.setScalar(escala);
        raiz.position.sub(centro.multiplyScalar(escala));
        conteudo.add(raiz);

        const raio = Math.max(tamanho.x, tamanho.y, tamanho.z) * escala * 0.55;
        alvoInicial.set(0, 0, 0);
        posicaoInicial.set(raio * 0.9, raio * 0.6, raio * 3.2);
      } else {
        const montada = construirPeca(tipo, materiais);
        conteudo.add(montada.grupo);
        posicaoInicial.copy(montada.camera);
        alvoInicial.copy(montada.alvo);
      }
    };

    // A montagem da peça (especialmente GLB grandes) não bloqueia o mount:
    // a cena resolve imediatamente e a peça é trocada quando o modelo carregar.
    void aplicarPeca(opcoes.tipoPeca ?? 'anel', opcoes.corGema ?? '#ffffff', opcoes.modelo).then(() => {
      camera.position.copy(posicaoInicial);
      camera.lookAt(alvoInicial);
      controles.target.copy(alvoInicial);
      controles.update();
      desenharUmFrame();
    });
    camera.position.set(0.4, 1.2, 6.4);
    camera.lookAt(0, 0.5, 0);

    // Poeira de diamante orbitando (profundidade).
    const orbitantes = new Group();
    const QTD_ORBITANTES = 14;
    const esferas: { esfera: InstanceType<typeof Mesh>; raio: number; fase: number; velocidade: number }[] = [];
    for (let i = 0; i < QTD_ORBITANTES; i++) {
      const esfera = new Mesh(new IcosahedronGeometry(0.028 + (i % 3) * 0.012, 0), materiais.brilho);
      orbitantes.add(esfera);
      esferas.push({
        esfera,
        raio: 2.1 + (i % 4) * 0.24,
        fase: (i / QTD_ORBITANTES) * Math.PI * 2,
        velocidade: 0.18 + (i % 4) * 0.05,
      });
    }
    grupo.add(orbitantes);

    // Sem pedestal sólido: a peça flutua sobre um aro de ouro, e o fundo do palco
    // (gradiente CSS) aparece através do canvas transparente.
    const trinco = new Mesh(new TorusGeometry(1.96, 0.014, 8, 120), materiais.metal);
    trinco.rotation.x = Math.PI / 2;
    trinco.position.y = -1.86;
    grupo.add(trinco);

    const chao = new Mesh(new CircleGeometry(24, 64), materiais.metalEscuro);
    chao.rotation.x = -Math.PI / 2;
    chao.position.y = -2.04;
    chao.visible = false;
    cena.add(chao);

    const controles = new OrbitControls(camera, canvas);
    controles.enableDamping = true;
    controles.dampingFactor = 0.06;
    controles.enablePan = false;
    controles.minDistance = 2.4;
    controles.maxDistance = 9;
    controles.minPolarAngle = 0.55;
    controles.maxPolarAngle = 1.65;
    controles.target.copy(alvoInicial);
    controles.update();

    let interagindo = false;
    controles.addEventListener('start', () => (interagindo = true));
    controles.addEventListener('end', () => (interagindo = false));

    const redimensionar = (): void => {
      camera.aspect = Math.max(canvas.clientWidth, 1) / Math.max(canvas.clientHeight, 1);
      camera.updateProjectionMatrix();
      renderizador.setSize(Math.max(canvas.clientWidth, 1), Math.max(canvas.clientHeight, 1));
      renderizador.render(cena, camera);
    };
    window.addEventListener('resize', redimensionar);

    let observador: IntersectionObserver | null = null;
    let visivel = true;
    if (typeof IntersectionObserver !== 'undefined') {
      observador = new IntersectionObserver((entradas) => {
        visivel = entradas[0]?.isIntersecting ?? true;
      });
      observador.observe(canvas);
    }

    let rodando = true;
    let contadorRender = 0;
    let ultimoFrame = performance.now();
    let ultimoRender = performance.now();
    /** `true` = animação contínua desligada; a cena só redesenha sob demanda. */
    let pausado = opcoes.movimentoReduzido === true;

    const desenhar = (): void => {
      if (!rodando) return;
      requestAnimationFrame(desenhar);

      const agora = performance.now();
      const dt = Math.min((agora - ultimoFrame) / 1000, 0.05);
      ultimoFrame = agora;

      if (document.hidden || !visivel) return;

      if (!pausado) {
        grupo.rotation.y += 0.22 * dt;
        orbitantes.rotation.z += 0.1 * dt;
        for (const orbita of esferas) {
          const t = agora * 0.001 * orbita.velocidade + orbita.fase;
          orbita.esfera.position.set(
            Math.cos(t) * orbita.raio,
            Math.sin(t * 0.6 + orbita.fase) * 0.35,
            Math.sin(t) * orbita.raio,
          );
        }
      }

      const mudou = controles.update();
      // Pausado, nada muda e nada tem damping em curso: não há o que redesenhar.
      const idle = pausado && !mudou && !interagindo;
      const devido = interagindo || mudou || !idle || agora - ultimoRender >= INTERVALO_IDLE_MS;

      if (devido) {
        renderizador.render(cena, camera);
        contadorRender++;
        ultimoRender = agora;
        if (contadorRender === 1 && opcoes.onPronto) opcoes.onPronto();
      }
    };
    desenhar();

    let limpo = false;
    const limpar = (): void => {
      if (limpo) return;
      limpo = true;
      rodando = false;
      observador?.disconnect();
      window.removeEventListener('resize', redimensionar);
      controles.dispose();
      limparGeometrias(cena);
      materiais.descartar();
      renderizador.dispose();
    };

    /**
     * Reposiciona a câmera a partir de coordenadas esféricas.
     * `OrbitControls` nesta versão só expõe os *getters* de ângulo — escrever
     * direto em `theta`/`phi` é o caminho suportado, e ainda respeitamos
     * `minPolarAngle`/`maxPolarAngle` para não furar o piso nem o teto.
     */
    const moverCamera = (ajuste: (esferica: InstanceType<typeof Spherical>) => void): void => {
      const esferica = new Spherical().setFromVector3(camera.position.clone().sub(controles.target));
      ajuste(esferica);
      esferica.phi = Math.min(
        controles.maxPolarAngle,
        Math.max(controles.minPolarAngle, esferica.phi),
      );
      esferica.radius = Math.min(
        controles.maxDistance,
        Math.max(controles.minDistance, esferica.radius),
      );
      camera.position.copy(controles.target).add(new Vector3().setFromSpherical(esferica));
    };

    /** Desenha no próximo frame (mudança vinda do teclado ou da UI). */
    const desenharUmFrame = (): void => {
      requestAnimationFrame(() => {
        if (!rodando || document.hidden) return;
        renderizador.render(cena, camera);
        contadorRender++;
        ultimoRender = performance.now();
      });
    };

    const cenaMontada: CenaMontada = {
      limpar,
      definirCor(hex: string): void {
        materiais.metal.color.set(hex);
        renderizador.render(cena, camera);
        contadorRender++;
      },
      definirPeca(tipo: TipoPeca, corGema: string, modelo?: string): void {
        void aplicarPeca(tipo, corGema, modelo).then(() => {
          camera.position.copy(posicaoInicial);
          controles.target.copy(alvoInicial);
          controles.update();
          desenharUmFrame();
        });
      },
      contagemRender: () => contadorRender,
      girar(deltaGraus: number): void {
        // Gira a peça, não a câmera: é o que o usuário espera de "setas ←/→"
        // e funciona igual com a animação pausada.
        grupo.rotation.y += deltaGraus * GRAU;
        desenharUmFrame();
      },
      inclinar(deltaGraus: number): void {
        moverCamera((e) => {
          e.phi -= deltaGraus * GRAU;
        });
        desenharUmFrame();
      },
      aproximar(fator: number): void {
        moverCamera((e) => {
          e.radius *= fator;
        });
        desenharUmFrame();
      },
      repor(): void {
        camera.position.copy(posicaoInicial);
        controles.target.copy(alvoInicial);
        controles.update();
        desenharUmFrame();
      },
      definirPausado(valor: boolean): void {
        pausado = valor;
        desenharUmFrame();
      },
      pausado: () => pausado,
      suportada: () => true,
    };

    this.cenaAtual = cenaMontada;
    return cenaMontada;
  }
}

/** Percorre a árvore e faz dispose das geometrias de todos os meshes. */
function limparGeometrias(raiz: InstanceType<typeof import('three').Object3D>): void {
  raiz.traverse((objeto) => {
    const malha = objeto as InstanceType<typeof import('three').Mesh>;
    if (malha.isMesh) malha.geometry.dispose();
  });
}