import { fakeAsync, flush, TestBed } from '@angular/core/testing';
import { LeadCapture } from './lead-capture';
import { LeadService } from '../../core/lead.service';

describe('LeadCapture', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [LeadCapture],
    }).compileComponents();
  });

  it('valida o e-mail e exibe erro no cliente', fakeAsync(() => {
    const fixture = TestBed.createComponent(LeadCapture);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    comp['nome'].set('Ana');
    comp['email'].set('sem-arroba');
    comp.enviar();
    flush();
    fixture.detectChanges();

    expect(comp.enviado()).toBeFalse();
    expect(comp.erro()).toContain('e-mail');
  }));

  it('captura o lead com dados válidos (modo demo)', fakeAsync(() => {
    const fixture = TestBed.createComponent(LeadCapture);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    comp['nome'].set('Ana Souza');
    comp['email'].set('ana@exemplo.com');
    comp.enviar();
    flush();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(comp.enviado()).toBeTrue();
    expect(comp.nome()).toBe('');
    expect(comp.email()).toBe('');
    expect(compiled.querySelector('.leads-sucesso')).toBeTruthy();
  }));

  it('evita envios duplicados enquanto está enviando', fakeAsync(() => {
    const fixture = TestBed.createComponent(LeadCapture);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    comp['enviando'].set(true);
    comp['nome'].set('Ana');
    comp['email'].set('ana@exemplo.com');
    expect(() => comp.enviar()).not.toThrow();
    flush();
    fixture.detectChanges();

    expect(comp.enviado()).toBeFalse();
  }));

  it('usa mensagem padrão quando o serviço não detalha o erro', fakeAsync(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [LeadCapture],
      providers: [
        {
          provide: LeadService,
          useValue: {
            cadastrar: jasmine.createSpy('cadastrar').and.returnValue(
              Promise.resolve({ ok: false, mensagem: undefined }),
            ),
          },
        },
      ],
    });

    const fixture = TestBed.createComponent(LeadCapture);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    comp['nome'].set('Ana');
    comp['email'].set('ana@exemplo.com');
    comp.enviar();
    flush();
    fixture.detectChanges();

    expect(comp.erro()).toContain('Algo deu errado');
  }));
});