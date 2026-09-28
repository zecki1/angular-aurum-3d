import { TestBed } from '@angular/core/testing';
import { AnunciadorService } from './anunciador.service';

/** Caractere invisível que o serviço usa para forçar a mudança de texto. */
const ZWSP_REGEX = new RegExp(String.fromCharCode(0x200b), 'g');

describe('AnunciadorService', () => {
  let servico: AnunciadorService;

  const polite = (): HTMLElement => document.getElementById('aurum-anuncio-polite')!;
  const assertive = (): HTMLElement => document.getElementById('aurum-anuncio-assertive')!;

  beforeEach(() => {
    document.getElementById('aurum-anuncio-polite')?.remove();
    document.getElementById('aurum-anuncio-assertive')?.remove();
    TestBed.configureTestingModule({});
    servico = TestBed.inject(AnunciadorService);
  });

  afterEach(() => {
    document.getElementById('aurum-anuncio-polite')?.remove();
    document.getElementById('aurum-anuncio-assertive')?.remove();
  });

  it('cria as duas live regions uma única vez, já na árvore', () => {
    // Leitores de tela só anunciam se a region já existia antes da mudança de
    // texto — por isso ela é criada na injeção, não no primeiro `anunciar`.
    expect(polite()).toBeTruthy();
    expect(assertive()).toBeTruthy();
    expect(polite().getAttribute('aria-live')).toBe('polite');
    expect(assertive().getAttribute('aria-live')).toBe('assertive');
    expect(polite().getAttribute('role')).toBe('status');
    expect(polite().getAttribute('aria-atomic')).toBe('true');
    expect(polite().classList.contains('sr-only')).toBeTrue();
  });

  it('não duplica a region ao pedir outro anúncio', () => {
    servico.anunciar('um');
    servico.anunciar('dois');
    expect(document.querySelectorAll('#aurum-anuncio-polite').length).toBe(1);
  });

  it('escreve o mensaje na region polite', () => {
    servico.anunciar('Fonte: 18 pixels');
    expect(polite().textContent).toContain('Fonte: 18 pixels');
  });

  it('força nova mudança de texto quando a mensagem se repete', () => {
    servico.anunciar('A+');
    const primeira = polite().textContent!;
    servico.anunciar('A+');
    const segunda = polite().textContent!;

    // Mesmo texto visível, `textContent` diferente: é o gatilho da live region.
    expect(segunda).not.toBe(primeira);
    expect(segunda.replace(/\u200B/g, '')).toBe('A+');
  });

  it('ignora mensagem vazia', () => {
    polite().textContent = 'marca';
    servico.anunciar('');
    expect(polite().textContent).toBe('marca');
  });

  it('separa avisos urgentes dos de rotina', () => {
    servico.anunciar('rotina');
    servico.anunciarUrgente('E-mail inválido');

    // O sufixo de largura zero é interno; o texto audível é o da mensagem.
    expect(polite().textContent?.replace(ZWSP_REGEX, '')).toBe('rotina');
    expect(assertive().textContent).toContain('E-mail inválido');
  });
});
