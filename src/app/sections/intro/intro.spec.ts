import { TestBed } from '@angular/core/testing';
import { Intro } from './intro';

describe('Intro', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Intro],
    }).compileComponents();
  });

  it('exibe o título da coleção', () => {
    const fixture = TestBed.createComponent(Intro);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.intro-titulo')?.textContent).toContain('OURO');
  });
});