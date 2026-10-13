import { Injectable } from '@angular/core';

export interface OpcoesCena {
  /** Cor PBR (hex) do material metálico principal. */
  corInicial: string;
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
export const COR_PADRAO = '#c9a24b';

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

  async montar(canvas: HTMLCanvasElement, opcoes: OpcoesCena): Promise<CenaMontada> {
    const {
      Scene,
      PerspectiveCamera,
      WebGLRenderer,
      Mesh,
      TorusKnotGeometry,
      TorusGeometry,
      CylinderGeometry,
      CircleGeometry,
      IcosahedronGeometry,
      MeshStandardMaterial,
      AmbientLight,
      DirectionalLight,
      HemisphereLight,
      Group,
      Vector3,
      Spherical,
      ACESFilmicToneMapping,
      PMREMGenerator,
    } = await import('three');
    const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');
    const { RoomEnvironment } = await import('three/examples/jsm/environments/RoomEnvironment.js');

    const largura = Math.max(canvas.clientWidth, 1);
    const altura = Math.max(canvas.clientHeight, 1);

    const cena = new Scene();

    // Enquadramento inicial — `repor()` volta para cá (tecla Home).
    const posicaoInicial = new Vector3(4.4, 3.1, 5.6);
    const alvoInicial = new Vector3(0, 0.15, 0);
    const GRAU = Math.PI / 180;

    const camera = new PerspectiveCamera(42, largura / altura, 0.1, 100);
    camera.position.copy(posicaoInicial);
    camera.lookAt(alvoInicial);

    let renderizador: InstanceType<typeof WebGLRenderer>;
    try {
      renderizador = new WebGLRenderer({ canvas, alpha: true, antialias: true });
    } catch {
      return noopCena();
    }
    renderizador.setSize(largura, altura);
    renderizador.setPixelRatio(Math.min(window.devicePixelRatio, LIMITE_DPR));
    renderizador.toneMapping = ACESFilmicToneMapping;
    renderizador.toneMappingExposure = 1.1;

    // Ambiente procedural (RoomEnvironment) — metais precisam de reflection map para "brilhar".
    const geradorAmbiente = new PMREMGenerator(renderizador);
    const ambiente = new RoomEnvironment();
    cena.environment = geradorAmbiente.fromScene(ambiente, 0.04).texture;
    geradorAmbiente.dispose();
    ambiente.dispose();

    cena.add(new AmbientLight(0xffffff, 0.45));
    const sol = new DirectionalLight(0xffe7c4, 2.4);
    sol.position.set(4, 6, 3);
    cena.add(sol);
    cena.add(new HemisphereLight(0xfff3dd, 0x14100b, 0.7));

    const materialPrincipal = new MeshStandardMaterial({
      color: opcoes.corInicial,
      metalness: 1,
      roughness: 0.2,
      envMapIntensity: 1.15,
    });
    const materialEscuro = new MeshStandardMaterial({
      color: 0x23201b,
      metalness: 0.9,
      roughness: 0.45,
      envMapIntensity: 0.8,
    });
    const materialChao = new MeshStandardMaterial({
      color: 0x0d0b09,
      metalness: 0,
      roughness: 0.95,
    });

    const grupo = new Group();

    grupo.add(new Mesh(new TorusKnotGeometry(1.1, 0.32, 220, 28), materialPrincipal));

    const anel = new Mesh(new TorusGeometry(1.8, 0.045, 12, 96), materialPrincipal);
    anel.rotation.x = Math.PI / 2;
    grupo.add(anel);

    const orbitantes = new Group();
    const QTD_ORBITANTES = 12;
    const esferas: { esfera: InstanceType<typeof Mesh>; raio: number; fase: number; velocidade: number }[] = [];
    for (let i = 0; i < QTD_ORBITANTES; i++) {
      const esfera = new Mesh(new IcosahedronGeometry(0.14, 0), materialEscuro);
      orbitantes.add(esfera);
      esferas.push({
        esfera,
        raio: 2.2 + (i % 3) * 0.22,
        fase: (i / QTD_ORBITANTES) * Math.PI * 2,
        velocidade: 0.25 + (i % 4) * 0.08,
      });
    }
    grupo.add(orbitantes);

    const plataforma = new Mesh(new CylinderGeometry(2.5, 2.72, 0.18, 64), materialEscuro);
    plataforma.position.y = -1.65;
    grupo.add(plataforma);

    const trinco = new Mesh(new TorusGeometry(2.5, 0.024, 8, 96), materialPrincipal);
    trinco.rotation.x = Math.PI / 2;
    trinco.position.y = -1.56;
    grupo.add(trinco);

    const chao = new Mesh(new CircleGeometry(22, 48), materialChao);
    chao.rotation.x = -Math.PI / 2;
    chao.position.y = -1.76;
    cena.add(chao);

    cena.add(grupo);

    const controles = new OrbitControls(camera, canvas);
    controles.enableDamping = true;
    controles.dampingFactor = 0.06;
    controles.enablePan = false;
    controles.minDistance = 2.4;
    controles.maxDistance = 9;
    controles.minPolarAngle = 0.45;
    controles.maxPolarAngle = 1.6;

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
        grupo.rotation.y += 0.12 * dt;
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
      materialPrincipal.dispose();
      materialEscuro.dispose();
      materialChao.dispose();
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
        materialPrincipal.color.set(hex);
        renderizador.render(cena, camera);
        contadorRender++;
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

/** Percorre a cena e faz dispose das geometrias de todos os meshes. */
function limparGeometrias(cena: InstanceType<typeof import('three').Scene>): void {
  cena.traverse((objeto) => {
    const malha = objeto as InstanceType<typeof import('three').Mesh>;
    if (malha.isMesh) malha.geometry.dispose();
  });
}