import {
  BufferGeometry,
  CatmullRomCurve3,
  Float32BufferAttribute,
  Vector2,
  Vector3,
  type Curve,
} from 'three';

/**
 * Geometria procedural de joalheria.
 *
 * Tudo aqui é construído a partir de medidas reais de ourivesaria (proporções
 * da lapidação brilhante, perfil de conforto do aro, garras que cobrem a
 * cintura da pedra) — não de primitivas encaixadas umas nas outras.
 */

export const TAU = Math.PI * 2;

/** Acumulador de triângulos com normais por face (facetas do diamante). */
class Malha {
  private readonly posicoes: number[] = [];

  tri(a: Vector3, b: Vector3, c: Vector3): void {
    this.posicoes.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  }

  quad(a: Vector3, b: Vector3, c: Vector3, d: Vector3): void {
    this.tri(a, b, c);
    this.tri(a, c, d);
  }

  geometria(): BufferGeometry {
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(this.posicoes, 3));
    // Sem índice, `computeVertexNormals` produz a normal de cada faceta:
    // é exatamente o que faz um diamante "acender" faceta por faceta.
    g.computeVertexNormals();
    g.computeBoundingSphere();
    return g;
  }
}

/**
 * Diamante de lapidação brilhante (round brilliant).
 *
 * Proporções usadas (em relação ao diâmetro):
 * - mesa 53%, altura da coroa 16,2%, profundidade do pavilhão 43,1%;
 * - 57 facetas: mesa (8 triângulos), 8 estrelas, 8 coroas (bezels),
 *   16 facetas de cintura superior, cintura, 16 facetas de pavilhão.
 *
 * O eixo da pedra é Y: a mesa olha para +Y e o culet para −Y.
 */
export function geometriaGema(raio = 1): BufferGeometry {
  const malha = new Malha();

  const lados = 16;
  const mesa = raio * 0.53;
  const alturaCoroa = raio * 0.324;
  const espessuraCintura = raio * 0.06;
  const profundidadePavilhao = raio * 0.862;

  const yCintura = espessuraCintura / 2;
  const yMesa = yCintura + alturaCoroa;
  const yCulet = -yCintura - profundidadePavilhao;

  const cinturaTopo: Vector3[] = [];
  const cinturaBase: Vector3[] = [];
  for (let j = 0; j < lados; j++) {
    const a = (j / lados) * TAU;
    cinturaTopo.push(new Vector3(Math.cos(a) * raio, yCintura, Math.sin(a) * raio));
    cinturaBase.push(new Vector3(Math.cos(a) * raio, -yCintura, Math.sin(a) * raio));
  }

  const table: Vector3[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    table.push(new Vector3(Math.cos(a) * mesa, yMesa, Math.sin(a) * mesa));
  }
  const centroMesa = new Vector3(0, yMesa, 0);
  const culet = new Vector3(0, yCulet, 0);

  // Mesa: leque de 8 triângulos.
  for (let i = 0; i < 8; i++) {
    malha.tri(centroMesa, table[i], table[(i + 1) % 8]);
  }

  for (let i = 0; i < 8; i++) {
    const proximo = (i + 1) % 8;
    const vale = cinturaTopo[(2 * i + 1) % lados];
    const bezelBaixo = cinturaTopo[(2 * i + 2) % lados];

    // Estrela: base na aresta da mesa, ápice no vale da cintura.
    malha.tri(table[i], table[proximo], vale);

    // Faceta de cintura superior: do canto da mesa ao vale e ao bezel.
    malha.tri(table[proximo], vale, bezelBaixo);

    // Coroa (bezel): pipa entre a mesa e a cintura.
    malha.quad(
      table[proximo],
      cinturaTopo[(2 * i + 3) % lados],
      cinturaTopo[(2 * i + 2) % lados],
      vale,
    );
  }

  // Cintura (faixa vertical) — 16 quadriláteros.
  for (let j = 0; j < lados; j++) {
    const k = (j + 1) % lados;
    malha.quad(cinturaTopo[j], cinturaBase[j], cinturaBase[k], cinturaTopo[k]);
  }

  // Pavilhão: 16 facetas convergindo no culet.
  for (let j = 0; j < lados; j++) {
    const k = (j + 1) % lados;
    malha.tri(cinturaBase[j], cinturaBase[k], culet);
  }

  return malha.geometria();
}

/** Perfil de conforto de um aro (seção transversal) em (radial, vertical). */
export function perfilAro(largura: number, espessura: number, suavidade = 10): Vector2[] {
  const w = largura / 2;
  const t = espessura / 2;
  const pontos: Vector2[] = [];

  // Face interna reta (o dedo encosta nela) e topo/base retos até o ombro.
  pontos.push(new Vector2(-t * 0.55, w));
  pontos.push(new Vector2(t * 0.2, w));

  // Ombro externo: arco de 180° que dá o "domo" do aro.
  for (let i = 0; i <= suavidade; i++) {
    const a = Math.PI / 2 - (i / suavidade) * Math.PI;
    pontos.push(new Vector2(t + Math.cos(a) * t * 0.18, Math.sin(a) * w));
  }

  pontos.push(new Vector2(t * 0.2, -w));
  pontos.push(new Vector2(-t * 0.55, -w));

  return pontos;
}

/**
 * Varre um perfil fechado em torno do eixo Z (aro apoiado no plano XY),
 * aceitando um perfil diferente a cada ângulo — é o que permite o aro afinar
 * e subir nos ombros até encontrar a cesta da pedra.
 */
export function geometriaAro(
  raio: number,
  segmentos: number,
  perfilEm: (t: number) => Vector2[],
): BufferGeometry {
  const posicoes: number[] = [];
  const indices: number[] = [];

  const anel = perfilEm(0);
  const porAnel = anel.length;

  for (let s = 0; s < segmentos; s++) {
    const a = (s / segmentos) * TAU;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    const perfil = perfilEm(s / segmentos);
    for (const p of perfil) {
      posicoes.push((raio + p.x) * cos, (raio + p.x) * sin, p.y);
    }
  }

  for (let s = 0; s < segmentos; s++) {
    const proximo = (s + 1) % segmentos;
    for (let j = 0; j < porAnel; j++) {
      const k = (j + 1) % porAnel;
      const a = s * porAnel + j;
      const b = s * porAnel + k;
      const c = proximo * porAnel + k;
      const d = proximo * porAnel + j;
      indices.push(a, b, c, a, c, d);
    }
  }

  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(posicoes, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

/**
 * Tubo ao longo de uma curva, com raio variável — garras, hastes, aros de
 * brinco e fios de colar. Sem índice repetido nas pontas: o tubo é aberto.
 */
export function geometriaTubo(
  curva: Curve<Vector3>,
  raioEm: (t: number) => number,
  segmentos = 32,
  radiais = 8,
): BufferGeometry {
  const frames = curva.computeFrenetFrames(segmentos, false);
  const posicoes: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= segmentos; i++) {
    const t = i / segmentos;
    const centro = curva.getPointAt(t);
    const normal = frames.normals[i];
    const binormal = frames.binormals[i];
    const r = raioEm(t);

    for (let j = 0; j < radiais; j++) {
      const a = (j / radiais) * TAU;
      const x = centro.x + (normal.x * Math.cos(a) + binormal.x * Math.sin(a)) * r;
      const y = centro.y + (normal.y * Math.cos(a) + binormal.y * Math.sin(a)) * r;
      const z = centro.z + (normal.z * Math.cos(a) + binormal.z * Math.sin(a)) * r;
      posicoes.push(x, y, z);
    }
  }

  for (let i = 0; i < segmentos; i++) {
    for (let j = 0; j < radiais; j++) {
      const k = (j + 1) % radiais;
      const a = i * radiais + j;
      const b = i * radiais + k;
      const c = (i + 1) * radiais + k;
      const d = (i + 1) * radiais + j;
      indices.push(a, b, c, a, c, d);
    }
  }

  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(posicoes, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

/**
 * Perfil fechado varrido ao longo de uma curva — fita de relógio, hastes e
 * qualquer seção que não seja circular. O eixo U corre no binormal (largura),
 * o eixo V no normal (espessura).
 */
export function geometriaFita(
  curva: Curve<Vector3>,
  perfil: Vector2[],
  segmentos = 48,
): BufferGeometry {
  const frames = curva.computeFrenetFrames(segmentos, false);
  const posicoes: number[] = [];
  const indices: number[] = [];
  const porAnel = perfil.length;

  for (let i = 0; i <= segmentos; i++) {
    const centro = curva.getPointAt(i / segmentos);
    const normal = frames.normals[i];
    const binormal = frames.binormals[i];
    for (const p of perfil) {
      posicoes.push(
        centro.x + binormal.x * p.x + normal.x * p.y,
        centro.y + binormal.y * p.x + normal.y * p.y,
        centro.z + binormal.z * p.x + normal.z * p.y,
      );
    }
  }

  for (let i = 0; i < segmentos; i++) {
    for (let j = 0; j < porAnel; j++) {
      const k = (j + 1) % porAnel;
      const a = i * porAnel + j;
      const b = i * porAnel + k;
      const c = (i + 1) * porAnel + k;
      const d = (i + 1) * porAnel + j;
      indices.push(a, b, c, a, c, d);
    }
  }

  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(posicoes, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

/** Curva suave a partir de pontos — usada em garras, colares e pulseiras. */
export function curvaDe(pontos: [number, number, number][], fechada = false): CatmullRomCurve3 {
  return new CatmullRomCurve3(
    pontos.map(([x, y, z]) => new Vector3(x, y, z)),
    fechada,
    'catmullrom',
    0.4,
  );
}
