import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ProductScene } from '../../sections/product-scene/product-scene';
import { Intro } from '../../sections/intro/intro';
import { Specs } from '../../sections/specs/specs';
import { Gallery } from '../../sections/gallery/gallery';
import { LeadCapture } from '../../sections/lead-capture/lead-capture';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Intro, ProductScene, Specs, Gallery, LeadCapture],
  selector: 'app-home',
  styleUrl: './home.css',
  templateUrl: './home.html',
})
export class Home {}