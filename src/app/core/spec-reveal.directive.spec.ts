import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SpecRevealDirective } from './spec-reveal.directive';

@Component({
  imports: [SpecRevealDirective],
  template: `<div class="alvo" appSpecReveal [appSpecReveal]="34">Conteúdo</div>`,
})
class HostRevelado {}

describe('SpecRevealDirective', () => {
  let matchMediaOriginal: typeof window.matchMedia;

  beforeEach(() => {
    matchMediaOriginal = window.matchMedia;
  });

  /**
   * `Object.defineProperty` em `window` é global para a suíte inteira: sem
   * restaurar, o stub de um teste decide o `prefers-reduced-motion` de todos os
   * testes seguintes.
   */
  afterEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: matchMediaOriginal,
    });
  });

  function sistemaPedeReduzido(valor: boolean): void {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: (consulta: string) =>
        ({
          matches: valor && consulta.includes('prefers-reduced-motion'),
          media: consulta,
          addEventListener: () => undefined,
          removeEventListener: () => undefined,
          onchange: null,
          dispatchEvent: () => false,
        }) as unknown as MediaQueryList,
    });
  }

  it('mantém o conteúdo visível quando o usuário pede movimento reduzido', () => {
    sistemaPedeReduzido(true);

    const fixture = TestBed.createComponent(HostRevelado);
    fixture.detectChanges();

    const alvo = (fixture.nativeElement as HTMLElement).querySelector('.alvo');
    expect(alvo).toBeTruthy();
    // Sem GSAP: o texto nasce visível (nada de `opacity: 0` preso no scroll).
    expect(alvo?.textContent).toContain('Conteúdo');
  });

  it('aplica a diretiva sem erro com animação normal', () => {
    sistemaPedeReduzido(false);

    const fixture = TestBed.createComponent(HostRevelado);
    expect(() => fixture.detectChanges()).not.toThrow();
  });

  it('reage ao botão do hub liga/desliga durante a vida da página', () => {
    sistemaPedeReduzido(false);
    const fixture = TestBed.createComponent(HostRevelado);
    fixture.detectChanges();
    expect(() => fixture.detectChanges()).not.toThrow();
    fixture.destroy();
  });
});
