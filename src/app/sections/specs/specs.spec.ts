import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Specs } from './specs';
import { SpecRevealDirective } from '../../core/spec-reveal.directive';

describe('Specs', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Specs],
    }).compileComponents();
  });

  it('exibe a ficha técnica da peça selecionada', () => {
    const fixture = TestBed.createComponent(Specs);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    const itens = compiled.querySelectorAll('.specs-item');
    expect(itens.length).toBe(fixture.componentInstance.selecionado().especificacoes.length);
    expect(compiled.querySelector('.specs-peca')?.textContent).toContain(
      fixture.componentInstance.selecionado().nome,
    );
  });

  it('aplica a diretiva de reveal no bloco de especificações', () => {
    const fixture = TestBed.createComponent(Specs);
    fixture.detectChanges();
    const grade = fixture.debugElement.query(By.css('.specs-grade'));
    expect(grade).toBeTruthy();
    expect(grade.injector.get(SpecRevealDirective).appSpecReveal).toBe(42);
  });
});