import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  signal,
  viewChildren,
} from '@angular/core';
import { AnunciadorService } from '../../core/anunciador.service';
import { apósRender } from '../../core/apos-render';
import { ProductsService, Produto } from '../../core/products.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  selector: 'app-gallery',
  styleUrl: './gallery.css',
  templateUrl: './gallery.html',
})
export class Gallery {
  readonly produtos = inject(ProductsService);
  private readonly anunciador = inject(AnunciadorService);
  private readonly cartoes = viewChildren<ElementRef<HTMLButtonElement>>('cartao');

  /** Índice que deve receber o foco após navegação por setas. */
  readonly focoPendente = signal<number | null>(null);

  /** Formata o preço em BRL. */
  preco(valor: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
  }

  /**
   * Seleção de item único = `radiogroup` do WAI-ARIA, não uma coleção de botões
   * alternados. As setas movem e selecionam, como num grupo de rádio nativo.
   */
  aoTecla(event: KeyboardEvent, indice: number): void {
    const lista = this.produtos.produtos();
    if (lista.length === 0) return;
    const salto: Record<string, number> = {
      ArrowRight: 1,
      ArrowDown: 1,
      ArrowLeft: -1,
      ArrowUp: -1,
    };

    let proximo: number;
    if (event.key === 'Home') proximo = 0;
    else if (event.key === 'End') proximo = lista.length - 1;
    else if (event.key in salto) proximo = (indice + salto[event.key] + lista.length) % lista.length;
    else return;

    event.preventDefault();
    this.selecionar(lista[proximo].id, true);
  }

  /** Só o cartão selecionado entra na ordem de tabulação (roving tabindex). */
  tabIndexDo(produto: Produto): number {
    return this.produtos.selecionadoId() === produto.id ? 0 : -1;
  }

  selecionar(id: string, moverFoco = false): void {
    const antes = this.produtos.selecionadoId();
    this.produtos.selecionar(id);
    if (antes === id) return;

    const produto = this.produtos.produtos().find((p) => p.id === id);
    if (produto) {
      this.anunciador.anunciar(
        `${produto.nome} selecionado. ${produto.metal}, ${this.preco(produto.preco)}. ` +
          'A cena e as especificações foram atualizadas.',
      );
    }
    if (!moverFoco) return;

    const indice = this.produtos.produtos().findIndex((p) => p.id === id);
    this.focoPendente.set(indice);
    apósRender(() => {
      if (this.focoPendente() === null) return;
      this.focoPendente.set(null);
      this.cartoes()[indice]?.nativeElement.focus();
    });
  }
}
