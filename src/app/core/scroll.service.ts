import { DestroyRef, Injectable, NgZone, effect, inject } from '@angular/core';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { AccessibilityService } from './accessibility.service';

/**
 * Rolagem e movimento da Maison.
 *
 * - **Lenis** dá a inércia de rolagem (o "peso" de vitrine de joalheria).
 * - **GSAP ScrollTrigger** lê a rolagem do Lenis e anima os elementos
 *   marcados com `data-parallax`.
 * - **AOS** revela os blocos marcados com `data-aos` uma única vez.
 *
 * Tudo nasce desligado quando o sistema (ou o hub de acessibilidade) pede
 * movimento reduzido — nesse caso a página rola nativamente, sem inércia.
 * O AOS entra por `import()` dinâmico: não pesa no bundle inicial.
 */
@Injectable({ providedIn: 'root' })
export class ScrollService {
  private readonly a11y = inject(AccessibilityService);
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);

  private lenis: Lenis | null = null;
  private ticker: ((time: number) => void) | null = null;
  private aos: typeof import('aos') | null = null;
  private iniciado = false;

  constructor() {
    this.destroyRef.onDestroy(() => this.parar());

    // Se o usuário ligar "reduzir movimento" com a página aberta, desmonta tudo.
    effect(() => {
      if (!this.iniciado) return;
      if (this.a11y.movimentoReduzido()) this.parar();
    });
  }

  iniciar(): void {
    if (this.iniciado || typeof window === 'undefined') return;
    this.iniciado = true;

    if (this.a11y.movimentoReduzido()) return;

    this.zone.runOutsideAngular(() => {
      gsap.registerPlugin(ScrollTrigger);

      this.lenis = new Lenis({
        lerp: 0.085,
        wheelMultiplier: 1,
        touchMultiplier: 1.4,
        smoothWheel: true,
        anchors: { offset: -84 },
      });

      this.lenis.on('scroll', ScrollTrigger.update);

      this.ticker = (time: number) => this.lenis?.raf(time * 1000);
      gsap.ticker.add(this.ticker);
      gsap.ticker.lagSmoothing(0);

      // Paralaxe discreta nos elementos marcados.
      for (const el of gsap.utils.toArray<HTMLElement>('[data-parallax]')) {
        const forca = Number(el.dataset['parallax'] ?? 60);
        gsap.fromTo(
          el,
          { y: forca * -0.5 },
          {
            y: forca * 0.5,
            ease: 'none',
            scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true },
          },
        );
      }

      void this.iniciarAos();
    });
  }

  private async iniciarAos(): Promise<void> {
    // `aos` é CommonJS: o interop do bundler pode entregar o objeto no `default`.
    const modulo = await import('aos');
    const AOS = ((modulo as unknown as { default?: typeof modulo }).default ?? modulo) as typeof modulo;
    if (!this.iniciado || this.a11y.movimentoReduzido()) return;

    this.aos = AOS;
    AOS.init({
      duration: 900,
      easing: 'ease-out-cubic',
      once: true,
      offset: 70,
      anchorPlacement: 'top-bottom',
    });
    AOS.refreshHard();
    // Só a partir daqui o CSS do AOS pode esconder o que está fora da tela.
    document.documentElement.classList.add('aos-pronto');
  }

  parar(): void {
    if (this.ticker) gsap.ticker.remove(this.ticker);
    this.ticker = null;
    this.lenis?.destroy();
    this.lenis = null;
    ScrollTrigger.getAll().forEach((t) => t.kill());
    this.aos?.refreshHard();
    document.documentElement.classList.remove('aos-pronto');
  }

  /** Rola suavemente até um seletor (usado pelos CTAs internos). */
  irPara(seletor: string): void {
    const alvo = document.querySelector(seletor);
    if (!alvo) return;
    if (this.lenis) this.lenis.scrollTo(alvo as HTMLElement, { offset: -84 });
    else (alvo as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
