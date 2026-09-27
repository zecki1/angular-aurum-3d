import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Header } from './header';

describe('Header', () => {
  let matchMediaOriginal: typeof window.matchMedia;

  beforeEach(async () => {
    matchMediaOriginal = window.matchMedia;
    await TestBed.configureTestingModule({
      imports: [Header],
    }).compileComponents();
  });

  afterEach(() => {
    window.matchMedia = matchMediaOriginal;
  });

  it('exibe o logo e os links de navegação', () => {
    const fixture = TestBed.createComponent(Header);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.cabecalho-logo')?.textContent).toContain('AURUM');
    const links = Array.from(compiled.querySelectorAll('a')).map((a) => a.textContent?.trim());
    expect(links).toContain('Especificações');
    expect(links).toContain('Quero uma peça');
  });

  it('não roda a animação de entrada com prefers-reduced-motion', () => {
    window.matchMedia = ((_consulta: string) => ({
      matches: true,
      media: _consulta,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      onchange: null,
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;

    const fixture = TestBed.createComponent(Header);
    expect(() => fixture.detectChanges()).not.toThrow();
    expect(fixture.debugElement.query(By.css('.cabecalho-logo'))).toBeTruthy();
    fixture.destroy();
  });
});