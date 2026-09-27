import { TestBed } from '@angular/core/testing';
import { Home } from './home';
import { SceneService } from '../../core/scene.service';

describe('Home', () => {
  let cenaFake: { limpar: jasmine.Spy; definirCor: jasmine.Spy; contagemRender(): number };

  beforeEach(async () => {
    cenaFake = {
      limpar: jasmine.createSpy('limpar'),
      definirCor: jasmine.createSpy('definirCor'),
      contagemRender: () => 1,
    };
    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [
        {
          provide: SceneService,
          useValue: {
            montar: jasmine.createSpy('montar').and.callFake((_canvas: unknown, opcoes: { onPronto?: () => void }) => {
              opcoes?.onPronto?.();
              return Promise.resolve(cenaFake);
            }),
            definirCor: jasmine.createSpy('definirCor'),
            cena: () => cenaFake,
          },
        },
      ],
    }).compileComponents();
  });

  it('compõe todas as seções da página única', async () => {
    const fixture = TestBed.createComponent(Home);
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.intro')).toBeTruthy();
    expect(compiled.querySelector('.cena canvas')).toBeTruthy();
    expect(compiled.querySelector('.specs')).toBeTruthy();
    expect(compiled.querySelector('.galeria')).toBeTruthy();
    expect(compiled.querySelector('.leads')).toBeTruthy();

    fixture.destroy();
  });
});