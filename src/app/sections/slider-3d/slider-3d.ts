import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { AccessibilityService } from '../../core/accessibility.service';
import { AnunciadorService } from '../../core/anunciador.service';
import { PASSO_GIRO, PASSO_ZOOM, CenaMontada, SceneService } from '../../core/scene.service';
import { ProductsService, Produto } from '../../core/products.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  selector: 'app-slider-3d',
  styleUrl: './slider-3d.css',
  templateUrl: './slider-3d.html',
})
export class Slider3d {
  private readonly produtos = inject(ProductsService);
  private readonly sceneService = inject(SceneService);
  private readonly a11y = inject(AccessibilityService);
  private readonly anunciador = inject(AnunciadorService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('sliderCanvas');

  readonly pronto = signal(false);
  readonly indice = signal(0);
  readonly total = computed(() => this.produtos.produtos().length);
  readonly atual = computed<Produto>(() => this.produtos.produtos()[this.indice()] ?? this.produtos.produtos()[0]);

  private destruido = false;
  private cena: CenaMontada | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => (this.destruido = true));
    afterNextRender({ write: () => void this.montar() });
  }

  async montar(): Promise<void> {
    const canvas = this.canvas()?.nativeElement;
    if (!canvas) return;
    const produto = this.atual();
    const cena = await this.sceneService.montar(canvas, {
      corInicial: produto.cor,
      tipoPeca: produto.tipo,
      corGema: produto.gema,
      modelo: produto.modelo,
      movimentoReduzido: this.a11y.movimentoReduzido(),
      onPronto: () => this.pronto.set(true),
    });
    if (this.destruido) {
      cena.limpar();
      return;
    }
    this.cena = cena;
    this.cena.definirPausado(this.a11y.movimentoReduzido());
  }

  irPara(novo: number): void {
    const lista = this.produtos.produtos();
    if (lista.length === 0) return;
    const idx = ((novo % lista.length) + lista.length) % lista.length;
    if (idx === this.indice()) return;
    this.indice.set(idx);
    const produto = lista[idx];
    this.sceneService.definirPeca(produto.tipo, produto.gema, produto.modelo);
    this.sceneService.definirCor(produto.cor);
    this.anunciador.anunciar(`${produto.nome} selecionado.`);
  }

  anterior(): void {
    this.irPara(this.indice() - 1);
  }

  proximo(): void {
    this.irPara(this.indice() + 1);
  }

  preco(valor: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
  }

  aoTecla(event: KeyboardEvent): boolean {
    const cena = this.cena;
    if (!cena?.suportada()) return false;
    switch (event.key) {
      case 'ArrowLeft': cena.girar(-PASSO_GIRO); break;
      case 'ArrowRight': cena.girar(PASSO_GIRO); break;
      case 'ArrowUp': cena.inclinar(-PASSO_GIRO); break;
      case 'ArrowDown': cena.inclinar(PASSO_GIRO); break;
      case '+': case '=': cena.aproximar(PASSO_ZOOM); break;
      case '-': case '_': cena.aproximar(1 / PASSO_ZOOM); break;
      case 'Home': cena.repor(); break;
      default: return false;
    }
    event.preventDefault();
    return true;
  }
}
