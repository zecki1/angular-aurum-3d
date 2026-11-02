import { Injectable, computed, signal } from '@angular/core';
import type { TipoPeca } from './jewelry/pecas';

export interface Especificacao {
  rotulo: string;
  valor: string;
}

export interface Produto {
  id: string;
  nome: string;
  categoria: string;
  /** Peça 3D montada na cena para este produto. */
  tipo: TipoPeca;
  preco: number;
  descricao: string;
  /** Cor PBR (hex) aplicada ao metal da cena 3D. */
  cor: string;
  /** Cor da pedra central (hex). Branco = diamante. */
  gema: string;
  metal: string;
  acabamento: string;
  /** Pedra central, quando a peça tem uma. */
  pedra?: string;
  /** Caminho do modelo GLTF/GLB real (sobrepõe a peça procedural). */
  modelo?: string;
  especificacoes: Especificacao[];
}

/**
 * Coleção local (modo demo). Na fase backend, `products` vem do Supabase
 * (`project_slug = 'aurum-3d'`), mantendo exatamente esta forma.
 */
const PRODUTOS: Produto[] = [
  {
    id: 'anel-doji',
    nome: 'Anel Doji',
    categoria: 'Solitaire',
    tipo: 'anel',
    preco: 24900,
    descricao:
      'Anel solitaire em ouro 18k com diamante de lapidação brilhante, escaneado a partir da peça original. Quatro garras finas sustentam a pedra e deixam a luz atravessar o pavilhão.',
    cor: '#d4af7a',
    gema: '#ffffff',
    metal: 'Ouro 18k',
    acabamento: 'Polido espelhado',
    pedra: 'Diamante · lapidação brilhante',
    modelo: '/models/doji-ring.glb',
    especificacoes: [
      { rotulo: 'Aro', valor: '2,1 mm' },
      { rotulo: 'Pedra', valor: '0,52 ct' },
      { rotulo: 'Pureza', valor: 'VS1' },
      { rotulo: 'Liga', valor: 'Au 750' },
    ],
  },
  {
    id: 'anel-ouro-diamante',
    nome: 'Anel Ouro com Diamante',
    categoria: 'Anel',
    tipo: 'anel-pave',
    preco: 16800,
    descricao:
      'Aro de ouro amarelo 18k com diamante central em garras clássicas, capturado em modelo 3D de alta fidelidade para visualização em tempo real.',
    cor: '#e0b84f',
    gema: '#ffffff',
    metal: 'Ouro amarelo 18k',
    acabamento: 'Polido',
    pedra: 'Diamante · lapidação brilhante',
    modelo: '/models/ring-gold-diamond.glb',
    especificacoes: [
      { rotulo: 'Aro', valor: '2,4 mm' },
      { rotulo: 'Pedra', valor: '0,30 ct' },
      { rotulo: 'Pureza', valor: 'VS2' },
      { rotulo: 'Liga', valor: 'Au 750' },
    ],
  },
  {
    id: 'colar-choker',
    nome: 'Choker 01',
    categoria: 'Colar',
    tipo: 'colar',
    preco: 11200,
    descricao:
      'Choker em metal dourado com fecho de couro e detalhes em pérola e pedra rosé, reproduzido em 3D a partir da peça original para experimentação de materiais.',
    cor: '#c8ccd1',
    gema: '#f2d6c9',
    metal: 'Metal dourado',
    acabamento: 'Polido + couro',
    pedra: 'Pérola · pedra rosé',
    modelo: '/models/choker.glb',
    especificacoes: [
      { rotulo: 'Comprimento', valor: '38 cm' },
      { rotulo: 'Peso', valor: '12,4 g' },
      { rotulo: 'Fecho', valor: 'Couro' },
      { rotulo: 'Liga', valor: 'Au 750' },
    ],
  },
  {
    id: 'brincos-hoop',
    nome: 'Brincos Hoop',
    categoria: 'Brincos',
    tipo: 'brinco',
    preco: 8900,
    descricao:
      'Par de argolas cruzadas em ouro com diamantes, digitalizado em 3D a partir da peça original para visualização fiel do caimento e do brilho.',
    cor: '#e8c877',
    gema: '#ffffff',
    metal: 'Ouro amarelo 18k',
    acabamento: 'Polido + pavé',
    pedra: 'Diamantes · lapidação brilhante',
    modelo: '/models/earrings.glb',
    especificacoes: [
      { rotulo: 'Diâmetro', valor: '18 mm' },
      { rotulo: 'Peso (par)', valor: '4,1 g' },
      { rotulo: 'Pedras', valor: '12' },
      { rotulo: 'Liga', valor: 'Au 750' },
    ],
  },
  {
    id: 'pulseira-bracelet',
    nome: 'Bracelet',
    categoria: 'Pulseira',
    tipo: 'pulseira',
    preco: 14600,
    descricao:
      'Pulseira em metal dourado com fecho de segurança, digitalizada em 3D para visualização fiel do caimento no pulso.',
    cor: '#d9a08a',
    gema: '#ffffff',
    metal: 'Ouro rosa 18k',
    acabamento: 'Polido',
    modelo: '/models/bracelet.glb',
    especificacoes: [
      { rotulo: 'Comprimento', valor: '17 cm' },
      { rotulo: 'Peso', valor: '9,2 g' },
      { rotulo: 'Fecho', valor: 'Segurança' },
      { rotulo: 'Liga', valor: 'Au 750' },
    ],
  },
  {
    id: 'composicao-jewelry',
    nome: 'Composição',
    categoria: 'Composição',
    tipo: 'relogio',
    preco: 0,
    descricao:
      'Composição de joias em cena de produto (anel + pingente), digitalizada em 3D para estudo de iluminação e enquadramento de vitrine.',
    cor: '#e0b84f',
    gema: '#ffffff',
    metal: 'Ouro amarelo 18k',
    acabamento: 'Polido',
    modelo: '/models/jewelry-placement.glb',
    especificacoes: [
      { rotulo: 'Peças', valor: '2' },
      { rotulo: 'Uso', valor: 'Vitrine' },
      { rotulo: 'Formato', valor: 'Cena' },
      { rotulo: 'Liga', valor: 'Au 750' },
    ],
  },
];

@Injectable({ providedIn: 'root' })
export class ProductsService {
  readonly produtos = signal<Produto[]>(PRODUTOS);
  readonly selecionadoId = signal<string>(PRODUTOS[0].id);

  readonly selecionado = computed<Produto>(() => {
    const atual = this.produtos().find((p) => p.id === this.selecionadoId());
    return atual ?? this.produtos()[0];
  });

  selecionar(id: string | null): void {
    if (!id) return;
    const existe = this.produtos().some((p) => p.id === id);
    if (!existe) return;
    this.selecionadoId.set(id);
  }
}
