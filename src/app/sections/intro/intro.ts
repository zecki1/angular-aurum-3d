import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  selector: 'app-intro',
  styleUrl: './intro.css',
  templateUrl: './intro.html',
})
export class Intro {}