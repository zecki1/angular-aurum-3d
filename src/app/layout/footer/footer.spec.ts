import { TestBed } from '@angular/core/testing';
import { Footer } from './footer';

describe('Footer', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Footer],
    }).compileComponents();
  });

  it('exibe a marca e os créditos com o ano atual', () => {
    const fixture = TestBed.createComponent(Footer);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.rodape-logo')?.textContent).toContain('AURUM');
    expect(compiled.querySelector('.rodape-creditos')?.textContent).toContain(
      String(new Date().getFullYear()),
    );
  });
});