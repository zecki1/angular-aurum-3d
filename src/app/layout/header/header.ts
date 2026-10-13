import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, inject, viewChild } from '@angular/core';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { AccessibilityService } from '../../core/accessibility.service';

gsap.registerPlugin(ScrollTrigger);

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  selector: 'app-header',
  styleUrl: './header.css',
  templateUrl: './header.html',
})
export class Header implements AfterViewInit {
  private readonly a11y = inject(AccessibilityService);
  private readonly cabecalho = viewChild.required<ElementRef<HTMLElement>>('cabecalho');

  ngAfterViewInit(): void {
    // O `ScrollTrigger` do logo some com o movimento reduzido, mas a classe
    // `rolado` (fundo da barra ao rolar) continua — é estado, não animação.
    if (this.a11y.movimentoReduzido()) {
      this.observarRolagem();
      return;
    }

    gsap.from(this.cabecalho().nativeElement, {
      y: -24,
      opacity: 0,
      duration: 0.7,
      ease: 'power3.out',
      delay: 0.2,
    });

    this.observarRolagem();
  }

  private observarRolagem(): void {
    ScrollTrigger.create({
      start: 40,
      end: 'max',
      onToggle: (self) => {
        this.cabecalho().nativeElement.classList.toggle('rolado', self.isActive);
      },
    });
  }
}
