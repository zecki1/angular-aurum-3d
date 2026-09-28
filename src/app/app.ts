import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AccessibilityHub } from './components/accessibility-hub/accessibility-hub';
import { ClarityService } from './core/clarity.service';
import { Footer } from './layout/footer/footer';
import { Header } from './layout/header/header';

@Component({
  imports: [RouterOutlet, Header, Footer, AccessibilityHub],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  private readonly clarityService = inject(ClarityService);

  constructor() {
    this.clarityService.iniciar();
  }
}
