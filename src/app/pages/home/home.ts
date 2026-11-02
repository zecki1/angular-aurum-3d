import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Atelier } from '../../sections/atelier/atelier';
import { Gallery } from '../../sections/gallery/gallery';
import { Intro } from '../../sections/intro/intro';
import { LeadCapture } from '../../sections/lead-capture/lead-capture';
import { Materiais } from '../../sections/materiais/materiais';
import { ProductScene } from '../../sections/product-scene/product-scene';
import { Slider3d } from '../../sections/slider-3d/slider-3d';
import { Specs } from '../../sections/specs/specs';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Intro, ProductScene, Slider3d, Specs, Gallery, Atelier, Materiais, LeadCapture],
  selector: 'app-home',
  styleUrl: './home.css',
  templateUrl: './home.html',
})
export class Home {}
