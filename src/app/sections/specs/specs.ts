import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ProductsService } from '../../core/products.service';
import { SpecRevealDirective } from '../../core/spec-reveal.directive';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SpecRevealDirective],
  selector: 'app-specs',
  styleUrl: './specs.css',
  templateUrl: './specs.html',
})
export class Specs {
  readonly selecionado = inject(ProductsService).selecionado;
}