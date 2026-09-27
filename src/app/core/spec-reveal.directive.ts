import { AfterViewInit, Directive, ElementRef, Input, inject } from '@angular/core';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { AccessibilityService } from './accessibility.service';

gsap.registerPlugin(ScrollTrigger);

/**
 * Revel as especificações quando o bloco entra na viewport (scroll-driven).
 * Respeita `prefers-reduced-motion` — nesse caso o conteúdo fica 100% visível.
 */
@Directive({
  selector: '[appSpecReveal]',
})
export class SpecRevealDirective implements AfterViewInit {
  private readonly el = inject(ElementRef<HTMLElement>);
  private readonly a11y = inject(AccessibilityService);

  /** Deslocamento vertical (px) percorrido durante a entrada. */
  @Input() appSpecReveal = 28;

  ngAfterViewInit(): void {
    // `movimentoReduzido` já combina a media query do sistema com o botão do
    // hub — consultar só o `matchMedia` ignoraria a escolha feita na página.
    if (this.a11y.movimentoReduzido()) return;

    gsap.from(this.el.nativeElement, {
      y: this.appSpecReveal,
      opacity: 0,
      duration: 0.9,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: this.el.nativeElement,
        start: 'top 88%',
        once: true,
      },
    });
  }
}
