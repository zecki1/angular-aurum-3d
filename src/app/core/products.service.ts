import { Injectable, computed, signal } from '@angular/core';

export interface Especificacao {
  rotulo: string;
  valor: string;
}

export interface Produto {
  id: string;
  nome: string;
  categoria: string;
  preco: number;
  descricao: string;
  /** Cor PBR (hex) aplicada ao material metálico da cena. */
  cor: string;
  metal: string;
  acabamento: string;
  especificacoes: Especificacao[];
}

/** Coleção mock local (VITE_ROLE=demo). Na fase backend, `products` vem do Supabase. */
const PRODUTOS: Produto[] = [
  {
    id: 'aurum-n1',
    nome: 'Aurum Nº 1',
    categoria: 'Escultura',
    preco: 18500,
    descricao: 'A peça-símbolo da coleção: uma escultura abstrata em ouro 18k que captura a luz em cada ângulo.',
    cor: '#c9a24b',
    metal: 'Ouro 18k',
    acabamento: 'Polidor espelhado',
    especificacoes: [
      { rotulo: 'Altura', valor: '82 mm' },
      { rotulo: 'Peso', valor: '128 g' },
      { rotulo: 'Liga', valor: 'Au 750' },
      { rotulo: 'Acabamento', valor: 'Espelhado' },
    ],
  },
  {
    id: 'aurum-n2',
    nome: 'Aurum Nº 2',
    categoria: 'Anel',
    preco: 4200,
    descricao: 'Anel escultural em ouro branco 18k com face facetada. Leveza arquitetônica no dedo.',
    cor: '#d9d6d2',
    metal: 'Ouro branco',
    acabamento: 'Facetado',
    especificacoes: [
      { rotulo: 'Banda', valor: '6 mm' },
      { rotulo: 'Peso', valor: '18 g' },
      { rotulo: 'Liga', valor: 'Au 750' },
      { rotulo: 'Perfil', valor: 'Domo facetado' },
    ],
  },
  {
    id: 'aurum-n3',
    nome: 'Aurum Nº 3',
    categoria: 'Pingente',
    preco: 6800,
    descricao: 'Pingente orbital em ouro rosa 18k: uma esfera cativa que se move livre no aro.',
    cor: '#d89a7e',
    metal: 'Ouro rosa',
    acabamento: 'Escovado + polido',
    especificacoes: [
      { rotulo: 'Diâmetro', valor: '24 mm' },
      { rotulo: 'Peso', valor: '12 g' },
      { rotulo: 'Liga', valor: 'Au 750' },
      { rotulo: 'Coração', valor: 'Esfera livre' },
    ],
  },
  {
    id: 'aurum-n4',
    nome: 'Aurum Nº 4',
    categoria: 'Manilha',
    preco: 12400,
    descricao: 'Manilha rígida em platina 950, com fecho oculto e superfície jateada aveludada.',
    cor: '#b9bfc6',
    metal: 'Platina 950',
    acabamento: 'Jateado fino',
    especificacoes: [
      { rotulo: 'Largura', valor: '8 mm' },
      { rotulo: 'Peso', valor: '34 g' },
      { rotulo: 'Liga', valor: 'Pt 950' },
      { rotulo: 'Fecho', valor: 'Oculto' },
    ],
  },
  {
    id: 'aurum-n5',
    nome: 'Aurum Nº 5',
    categoria: 'Brincos',
    preco: 5600,
    descricao: 'Par de brincos em ouro amarelo 18k com haste cônica e contrapeso esférico.',
    cor: '#b8860b',
    metal: 'Ouro amarelo',
    acabamento: 'Polido',
    especificacoes: [
      { rotulo: 'Altura', valor: '31 mm' },
      { rotulo: 'Peso (par)', valor: '14 g' },
      { rotulo: 'Liga', valor: 'Au 750' },
      { rotulo: 'Fecho', valor: 'Pino com mola' },
    ],
  },
  {
    id: 'aurum-n6',
    nome: 'Aurum Nº 6',
    categoria: 'Escultura',
    preco: 21900,
    descricao: 'Torus contínuo em ouro 18k com núcleo em nióbio oxidado — a peça de maior técnica da coleção.',
    cor: '#e6c77b',
    metal: 'Ouro 18k + nióbio',
    acabamento: 'Polidor + oxidação',
    especificacoes: [
      { rotulo: 'Diâmetro', valor: '96 mm' },
      { rotulo: 'Peso', valor: '142 g' },
      { rotulo: 'Liga', valor: 'Au 750 / Nb' },
      { rotulo: 'Núcleo', valor: 'Nióbio oxidado' },
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