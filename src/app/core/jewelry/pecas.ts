import {
  BoxGeometry,
  CircleGeometry,
  CylinderGeometry,
  Group,
  Matrix4,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Quaternion,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  Vector3,
} from 'three';
import { curvaDe, geometriaAro, geometriaFita, geometriaGema, geometriaTubo, perfilAro, TAU } from './geometria';

export type TipoPeca = 'anel' | 'anel-pave' | 'colar' | 'brinco' | 'pulseira' | 'relogio';

export interface CoresPeca {
  /** Cor PBR do metal principal (hex). */
  metal: string;
  /** Cor da pedra central (hex). Branco = diamante. */
  gema: string;
}

export interface PecaMontada {
  grupo: Group;
  /** Ponto para onde a câmera olha nesta peça. */
  alvo: Vector3;
  /** Posição inicial da câmera nesta peça. */
  camera: Vector3;
}

export interface MateriaisPeca {
  metal: MeshStandardMaterial;
  metalEscuro: MeshStandardMaterial;
  diamante: MeshPhysicalMaterial;
  brilho: MeshPhysicalMaterial;
  gema: MeshPhysicalMaterial;
  onyx: MeshStandardMaterial;
  couro: MeshStandardMaterial;
  descartar(): void;
}

const CINZA_ESCURO = 0x171310;

/** Materiais PBR compartilhados por todas as peças da cena. */
export function criarMateriais(cores: CoresPeca): MateriaisPeca {
  const metal = new MeshStandardMaterial({
    color: cores.metal,
    metalness: 1,
    roughness: 0.11,
    envMapIntensity: 1.55,
  });
  const metalEscuro = new MeshStandardMaterial({
    color: CINZA_ESCURO,
    metalness: 0.7,
    roughness: 0.55,
    envMapIntensity: 0.6,
  });
  // Diamante grande: transmissão dá a profundidade do pavilhão; as facetas
  // planas vêm do `flatShading` da geometria.
  const diamante = new MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0,
    roughness: 0.02,
    envMapIntensity: 2.8,
    flatShading: true,
    clearcoat: 1,
    clearcoatRoughness: 0.01,
    transmission: 0.86,
    thickness: 0.5,
    ior: 2.42,
    specularIntensity: 1,
    iridescence: 0.28,
    iridescenceIOR: 1.9,
  });
  // Pedras pequenas: sem transmissão (custo), só reflexo e iridescência.
  const brilho = new MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0,
    roughness: 0.02,
    envMapIntensity: 3.2,
    flatShading: true,
    clearcoat: 1,
    clearcoatRoughness: 0.01,
    iridescence: 0.5,
    iridescenceIOR: 1.85,
    specularIntensity: 1,
  });
  const gema = new MeshPhysicalMaterial({
    color: cores.gema,
    metalness: 0,
    roughness: 0.04,
    envMapIntensity: 2.2,
    flatShading: true,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    transmission: 0.55,
    thickness: 0.7,
    ior: 1.78,
  });
  const onyx = new MeshStandardMaterial({
    color: 0x07080a,
    metalness: 0.25,
    roughness: 0.32,
    envMapIntensity: 0.9,
  });
  const couro = new MeshStandardMaterial({
    color: 0x1c130d,
    metalness: 0,
    roughness: 0.82,
  });

  return {
    metal,
    metalEscuro,
    diamante,
    brilho,
    gema,
    onyx,
    couro,
    descartar(): void {
      metal.dispose();
      metalEscuro.dispose();
      diamante.dispose();
      brilho.dispose();
      gema.dispose();
      onyx.dispose();
      couro.dispose();
    },
  };
}

/** Pedra de lapidação brilhante em escala real (raio em unidades de cena). */
function pedra(raio: number, material: MeshPhysicalMaterial, geometria: ReturnType<typeof geometriaGema>): Mesh {
  const malha = new Mesh(geometria, material);
  malha.scale.setScalar(raio);
  return malha;
}

/**
 * Anel solitaire: aro com perfil de conforto que sobe nos ombros até a cesta,
 * quatro garras que cobrem a cintura da pedra e o diamante assentado na cesta.
 */
function anelSolitaire(m: MateriaisPeca): PecaMontada {
  const grupo = new Group();
  const gemaGeo = geometriaGema(1);

  const RAIO = 1.22;
  const LARGURA = 0.2;
  const ESPESSURA = 0.085;
  const SUBIDA = 0.26;

  const aro = new Mesh(
    geometriaAro(RAIO, 220, (t) => {
      const a = t * TAU;
      // 1 no topo do aro (a = 90°), 0 nas laterais: o ombro sobe até a cesta.
      const peso = Math.pow(Math.max(0, Math.sin(a)), 7);
      const perfil = perfilAro(LARGURA * (1 - 0.5 * peso), ESPESSURA * (1 - 0.2 * peso));
      return perfil.map((p) => new Vector2(p.x + SUBIDA * peso, p.y));
    }),
    m.metal,
  );
  grupo.add(aro);

  const topo = RAIO + SUBIDA;
  const raioGema = 0.33;
  const yCintura = topo + 0.3;
  const yCesta = yCintura - 0.34;

  // Cesta: dois aros finos que seguram a base do pavilhão.
  const cesta = new Mesh(new TorusGeometry(raioGema * 0.78, 0.028, 12, 48), m.metal);
  cesta.rotation.x = Math.PI / 2;
  cesta.position.y = yCesta;
  grupo.add(cesta);

  const cestaBaixa = new Mesh(new TorusGeometry(raioGema * 0.42, 0.022, 10, 36), m.metal);
  cestaBaixa.rotation.x = Math.PI / 2;
  cestaBaixa.position.y = yCesta - 0.14;
  grupo.add(cestaBaixa);

  // Garras: nascem na cesta, sobem por fora do pavilhão e fecham sobre a coroa.
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + Math.PI / 4;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    const curva = curvaDe([
      [cos * raioGema * 0.9, yCesta - 0.04, sin * raioGema * 0.9],
      [cos * raioGema * 1.02, yCesta + 0.16, sin * raioGema * 1.02],
      [cos * raioGema * 1.04, yCintura - 0.08, sin * raioGema * 1.04],
      [cos * raioGema * 0.96, yCintura + 0.03, sin * raioGema * 0.96],
      [cos * raioGema * 0.88, yCintura + 0.11, sin * raioGema * 0.88],
    ]);
    const garra = new Mesh(
      geometriaTubo(curva, (t) => 0.036 - 0.012 * t, 28, 8),
      m.metal,
    );
    grupo.add(garra);

    const ponta = new Mesh(new SphereGeometry(0.023, 12, 10), m.metal);
    ponta.position.set(cos * raioGema * 0.88, yCintura + 0.11, sin * raioGema * 0.88);
    grupo.add(ponta);
  }

  const diamante = pedra(raioGema, m.diamante, gemaGeo);
  diamante.position.y = yCintura;
  grupo.add(diamante);

  return {
    grupo,
    alvo: new Vector3(0, topo + 0.1, 0),
    camera: new Vector3(0.55, topo + 0.55, 4.35),
  };
}

/** Aliança com pavé: fileira de diamantes engastados na face externa do aro. */
function anelPave(m: MateriaisPeca): PecaMontada {
  const grupo = new Group();
  const gemaGeo = geometriaGema(1);

  const RAIO = 1.22;
  const LARGURA = 0.24;
  const ESPESSURA = 0.09;

  const aro = new Mesh(
    geometriaAro(RAIO, 200, () => perfilAro(LARGURA, ESPESSURA)),
    m.metal,
  );
  grupo.add(aro);

  const quantidade = 21;
  const inicio = Math.PI * 0.12;
  const fim = Math.PI * 0.88;
  const raioPedra = 0.055;

  for (let i = 0; i < quantidade; i++) {
    const a = inicio + ((fim - inicio) * i) / (quantidade - 1);
    const cos = Math.cos(a);
    const sin = Math.sin(a);

    // Berço: anel de metal que abraça a cintura da pedra.
    const berco = new Mesh(new TorusGeometry(raioPedra * 0.82, 0.011, 8, 24), m.metal);
    berco.position.set(cos * (RAIO + ESPESSURA * 0.42), sin * (RAIO + ESPESSURA * 0.42), 0);
    berco.rotation.z = a - Math.PI / 2;
    berco.rotation.x = Math.PI / 2;
    grupo.add(berco);

    const stone = pedra(raioPedra, m.brilho, gemaGeo);
    stone.position.set(cos * (RAIO + ESPESSURA * 0.36), sin * (RAIO + ESPESSURA * 0.36), 0);
    stone.rotation.z = a - Math.PI / 2;
    grupo.add(stone);
  }

  return {
    grupo,
    alvo: new Vector3(0, RAIO, 0),
    camera: new Vector3(0.35, RAIO + 0.25, 3.6),
  };
}

/** Colar: corrente de elos alternados em catenária, com pingente de safira. */
function colar(m: MateriaisPeca): PecaMontada {
  const grupo = new Group();
  const gemaGeo = geometriaGema(1);

  const curva = curvaDe([
    [-1.42, 1.12, 0],
    [-1.08, 0.5, 0],
    [-0.58, -0.24, 0],
    [0, -0.62, 0],
    [0.58, -0.24, 0],
    [1.08, 0.5, 0],
    [1.42, 1.12, 0],
  ]);

  const elos = Math.round(curva.getLength() / 0.068);
  const frames = curva.computeFrenetFrames(elos, false);
  const eloGeo = new TorusGeometry(0.048, 0.013, 8, 16);
  const base = new Matrix4();

  for (let i = 0; i <= elos; i++) {
    const t = i / elos;
    const ponto = curva.getPointAt(t);
    const tangente = frames.tangents[i].clone().normalize();
    const normal = frames.normals[i].clone().normalize();
    const binormal = frames.binormals[i].clone().normalize();
    const eixo = i % 2 === 0 ? normal : binormal;
    const outro = eixo === normal ? binormal : normal;

    const elo = new Mesh(eloGeo, m.metal);
    base.makeBasis(tangente, outro.clone().cross(tangente).normalize(), eixo);
    elo.quaternion.copy(new Quaternion().setFromRotationMatrix(base));
    elo.position.copy(ponto);
    grupo.add(elo);
  }

  // Argola do pingente.
  const argola = new Mesh(new TorusGeometry(0.05, 0.014, 8, 24), m.metal);
  argola.position.set(0, -0.66, 0);
  grupo.add(argola);

  // Moldura em gota (lágrima) varrida com fio de metal.
  const gota = curvaDe(
    [
      [0, -0.72, 0],
      [0.2, -0.95, 0],
      [0.26, -1.24, 0],
      [0.14, -1.44, 0],
      [0, -1.5, 0],
      [-0.14, -1.44, 0],
      [-0.26, -1.24, 0],
      [-0.2, -0.95, 0],
    ],
    true,
  );
  const moldura = new Mesh(geometriaTubo(gota, () => 0.022, 90, 8), m.metal);
  grupo.add(moldura);

  const safira = pedra(0.2, m.gema, gemaGeo);
  safira.scale.set(0.2, 0.3, 0.2);
  safira.position.set(0, -1.12, 0);
  grupo.add(safira);

  return {
    grupo,
    alvo: new Vector3(0, 0.05, 0),
    camera: new Vector3(0.2, 0.1, 4.5),
  };
}

/** Brincos: par de argolas crescentes com diamantes na frente do arco. */
function brincos(m: MateriaisPeca): PecaMontada {
  const grupo = new Group();
  const gemaGeo = geometriaGema(1);

  const RAIO = 0.52;
  const arco = Math.PI * 1.55;

  for (const lado of [-1, 1]) {
    const argola = new Group();

    const curva = curvaDe([
      [Math.cos(-arco / 2) * RAIO, Math.sin(-arco / 2) * RAIO, 0],
      [Math.cos(-arco / 4) * RAIO, Math.sin(-arco / 4) * RAIO, 0],
      [0, RAIO, 0],
      [Math.cos(arco / 4) * RAIO, Math.sin(arco / 4) * RAIO, 0],
      [Math.cos(arco / 2) * RAIO, Math.sin(arco / 2) * RAIO, 0],
    ]);
    const aro = new Mesh(
      geometriaTubo(curva, (t) => 0.022 + Math.sin(Math.PI * t) * 0.032, 90, 10),
      m.metal,
    );
    argola.add(aro);

    // Diamantes no arco inferior, com a mesa voltada para fora.
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI * 0.62 + (i / 4) * Math.PI * 0.5;
      const stone = pedra(0.045, m.brilho, gemaGeo);
      stone.position.set(Math.cos(a) * (RAIO + 0.03), Math.sin(a) * (RAIO + 0.03), 0.035);
      stone.rotation.z = a - Math.PI / 2;
      argola.add(stone);
    }

    argola.position.x = lado * 0.62;
    argola.rotation.y = lado * -0.32;
    argola.rotation.z = lado * 0.06;
    grupo.add(argola);
  }

  return {
    grupo,
    alvo: new Vector3(0, 0.02, 0),
    camera: new Vector3(0.1, 0.25, 3.15),
  };
}

/** Pulseira: fileira contínua de diamantes em berços ligados por dobradiças. */
function pulseira(m: MateriaisPeca): PecaMontada {
  const grupo = new Group();
  const gemaGeo = geometriaGema(1);

  const RAIO = 1.08;
  const abertura = Math.PI * 1.28;
  const quantidade = 23;
  const raioPedra = 0.062;

  for (let i = 0; i < quantidade; i++) {
    const a = -abertura / 2 + (abertura * i) / (quantidade - 1);
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    const x = cos * RAIO;
    const y = sin * RAIO;

    const berco = new Mesh(new CylinderGeometry(0.082, 0.086, 0.055, 18), m.metal);
    berco.position.set(x, y, 0);
    berco.rotation.z = a - Math.PI / 2;
    berco.rotation.x = Math.PI / 2;
    grupo.add(berco);

    const stone = pedra(raioPedra, m.brilho, gemaGeo);
    stone.position.set(cos * (RAIO + 0.045), sin * (RAIO + 0.045), 0);
    stone.rotation.z = a - Math.PI / 2;
    grupo.add(stone);

    // Dobradiça entre um berço e o próximo.
    if (i < quantidade - 1) {
      const proximo = -abertura / 2 + (abertura * (i + 1)) / (quantidade - 1);
      const meio = (a + proximo) / 2;
      const elo = new Mesh(new BoxGeometry(0.045, 0.03, 0.05), m.metal);
      elo.position.set(Math.cos(meio) * RAIO, Math.sin(meio) * RAIO, 0);
      elo.rotation.z = meio - Math.PI / 2;
      grupo.add(elo);
    }
  }

  // Fecho: caixa com alça de segurança na ponta do arco.
  const ponta = -abertura / 2;
  const fecho = new Mesh(new BoxGeometry(0.13, 0.09, 0.07), m.metal);
  fecho.position.set(Math.cos(ponta) * RAIO, Math.sin(ponta) * RAIO, 0);
  fecho.rotation.z = ponta - Math.PI / 2;
  grupo.add(fecho);

  const alca = new Mesh(new TorusGeometry(0.05, 0.012, 8, 20), m.metal);
  alca.position.set(Math.cos(ponta) * (RAIO + 0.09), Math.sin(ponta) * (RAIO + 0.09), 0);
  grupo.add(alca);

  return {
    grupo,
    alvo: new Vector3(0, 0.1, 0),
    camera: new Vector3(0.2, 0.35, 4.1),
  };
}

/** Relógio: caixa, mostrador de ônix, índices, ponteiros e fita. */
function relogio(m: MateriaisPeca): PecaMontada {
  const grupo = new Group();

  const RAIO_CAIXA = 0.62;

  const caixa = new Mesh(new CylinderGeometry(RAIO_CAIXA, RAIO_CAIXA, 0.17, 64), m.metal);
  caixa.rotation.x = Math.PI / 2;
  grupo.add(caixa);

  const fundo = new Mesh(new CylinderGeometry(RAIO_CAIXA * 0.92, RAIO_CAIXA * 0.95, 0.06, 48), m.metalEscuro);
  fundo.rotation.x = Math.PI / 2;
  fundo.position.z = -0.11;
  grupo.add(fundo);

  const aro = new Mesh(new TorusGeometry(RAIO_CAIXA, 0.045, 14, 72), m.metal);
  aro.position.z = 0.085;
  grupo.add(aro);

  const mostrador = new Mesh(new CircleGeometry(RAIO_CAIXA * 0.9, 64), m.onyx);
  mostrador.position.z = 0.087;
  grupo.add(mostrador);

  // Índices: 12 traços, mais largos nas horas cardeais.
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    const cardinal = i % 3 === 0;
    const indice = new Mesh(
      new BoxGeometry(cardinal ? 0.035 : 0.018, cardinal ? 0.11 : 0.075, 0.012),
      m.metal,
    );
    const r = RAIO_CAIXA * 0.72;
    indice.position.set(Math.sin(a) * r, Math.cos(a) * r, 0.092);
    indice.rotation.z = -a;
    grupo.add(indice);
  }

  // Ponteiros (10:10, o clássico de vitrine).
  const hora = new Mesh(new BoxGeometry(0.036, 0.26, 0.012), m.metal);
  hora.geometry.translate(0, 0.11, 0);
  hora.position.z = 0.098;
  hora.rotation.z = -Math.PI * 0.17;
  grupo.add(hora);

  const minuto = new Mesh(new BoxGeometry(0.026, 0.4, 0.012), m.metal);
  minuto.geometry.translate(0, 0.18, 0);
  minuto.position.z = 0.1;
  minuto.rotation.z = Math.PI * 0.28;
  grupo.add(minuto);

  const segundo = new Mesh(new BoxGeometry(0.008, 0.44, 0.006), m.gema);
  segundo.geometry.translate(0, 0.18, 0);
  segundo.position.z = 0.104;
  segundo.rotation.z = Math.PI * 0.62;
  grupo.add(segundo);

  const eixo = new Mesh(new CylinderGeometry(0.028, 0.028, 0.02, 20), m.metal);
  eixo.rotation.x = Math.PI / 2;
  eixo.position.z = 0.11;
  grupo.add(eixo);

  // Coroa.
  const coroa = new Mesh(new CylinderGeometry(0.06, 0.07, 0.1, 20), m.metal);
  coroa.rotation.z = Math.PI / 2;
  coroa.position.set(RAIO_CAIXA + 0.04, 0, 0);
  grupo.add(coroa);

  // Garras (asas) entre a caixa e a fita.
  for (const lado of [-1, 1]) {
    for (const deslocamento of [-0.26, 0.26]) {
      const garra = new Mesh(new BoxGeometry(0.1, 0.16, 0.09), m.metal);
      garra.position.set(deslocamento, lado * (RAIO_CAIXA + 0.04), -0.01);
      grupo.add(garra);
    }
  }

  // Fita: perfil retangular varrido, curvando para trás como num pulso.
  const perfilFita: Vector2[] = [
    new Vector2(-0.19, -0.03),
    new Vector2(0.19, -0.03),
    new Vector2(0.19, 0.03),
    new Vector2(-0.19, 0.03),
  ];

  for (const lado of [-1, 1]) {
    const curva = curvaDe([
      [0, lado * (RAIO_CAIXA + 0.06), -0.02],
      [0, lado * (RAIO_CAIXA + 0.42), -0.12],
      [0, lado * (RAIO_CAIXA + 0.78), -0.5],
      [0, lado * (RAIO_CAIXA + 0.92), -1.0],
    ]);
    const fita = new Mesh(geometriaFita(curva, perfilFita, 40), m.couro);
    grupo.add(fita);
  }

  return {
    grupo,
    alvo: new Vector3(0, 0.15, 0),
    camera: new Vector3(0.35, 0.5, 3.9),
  };
}

/** Fábrica das peças — cada tipo monta a sua própria geometria e enquadramento. */
export function construirPeca(tipo: TipoPeca, m: MateriaisPeca): PecaMontada {
  switch (tipo) {
    case 'anel-pave':
      return anelPave(m);
    case 'colar':
      return colar(m);
    case 'brinco':
      return brincos(m);
    case 'pulseira':
      return pulseira(m);
    case 'relogio':
      return relogio(m);
    case 'anel':
    default:
      return anelSolitaire(m);
  }
}
