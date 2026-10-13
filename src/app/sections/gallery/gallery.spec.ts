import { TestBed } from '@angular/core/testing';
import { Gallery } from './gallery';

describe('Gallery', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Gallery],
    }).compileComponents();
  });

  it('renderiza todos os produtos da coleção', () => {
    const fixture = TestBed.createComponent(Gallery);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelectorAll('.galeria-card').length).toBe(
      fixture.componentInstance.produtos.produtos().length,
    );
  });

  it('seleciona um produto ao clicar e marca o estado', () => {
    const fixture = TestBed.createComponent(Gallery);
    fixture.detectChanges();
    const comp = fixture.componentInstance;
    const primeiro = comp.produtos.produtos()[0];
    const segundo = comp.produtos.produtos()[1];

    const cartoes = (fixture.nativeElement as HTMLElement).querySelectorAll('.galeria-card');
    expect(comp.produtos.selecionadoId()).toBe(primeiro.id);

    (cartoes[1] as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(comp.produtos.selecionadoId()).toBe(segundo.id);
    expect(cartoes[1].getAttribute('aria-checked')).toBe('true');
    expect(cartoes[0].getAttribute('aria-checked')).toBe('false');
  });

  it('é um radiogroup: só o cartão selecionado é tabulável', () => {
    const fixture = TestBed.createComponent(Gallery);
    fixture.detectChanges();
    const comp = fixture.componentInstance;
    const cartoes = (fixture.nativeElement as HTMLElement).querySelectorAll('.galeria-card');
    const lista = comp.produtos.produtos();

    const grupo = (fixture.nativeElement as HTMLElement).querySelector('[role="radiogroup"]');
    expect(grupo).toBeTruthy();

    expect(cartoes[0].getAttribute('tabindex')).toBe('0');
    expect(cartoes[1].getAttribute('tabindex')).toBe('-1');

    (cartoes[1] as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(cartoes[1].getAttribute('tabindex')).toBe('0');
    expect(cartoes[0].getAttribute('tabindex')).toBe('-1');
    expect(comp.tabIndexDo(lista[0])).toBe(-1);
    expect(comp.tabIndexDo(lista[1])).toBe(0);
  });

  it('navega e seleciona com as setas (padrão de radiogroup)', () => {
    const fixture = TestBed.createComponent(Gallery);
    fixture.detectChanges();
    const comp = fixture.componentInstance;
    const lista = comp.produtos.produtos();
    const cartoes = (fixture.nativeElement as HTMLElement).querySelectorAll('.galeria-card');

    const seta = (indice: number, key: string): KeyboardEvent =>
      new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });

    cartoes[0].dispatchEvent(seta(0, 'ArrowRight'));
    fixture.detectChanges();
    expect(comp.produtos.selecionadoId()).toBe(lista[1].id);

    cartoes[1].dispatchEvent(seta(1, 'ArrowLeft'));
    fixture.detectChanges();
    expect(comp.produtos.selecionadoId()).toBe(lista[0].id);

    // Date para o fim da lista.
    cartoes[0].dispatchEvent(seta(0, 'ArrowLeft'));
    fixture.detectChanges();
    expect(comp.produtos.selecionadoId()).toBe(lista[lista.length - 1].id);

    cartoes[lista.length - 1].dispatchEvent(seta(lista.length - 1, 'Home'));
    fixture.detectChanges();
    expect(comp.produtos.selecionadoId()).toBe(lista[0].id);
  });

  it(' impede a rolagem da página nas teclas de navegação', () => {
    const fixture = TestBed.createComponent(Gallery);
    fixture.detectChanges();
    const cartoes = (fixture.nativeElement as HTMLElement).querySelectorAll('.galeria-card');
    const evento = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true });

    cartoes[0].dispatchEvent(evento);
    expect(evento.defaultPrevented).toBeTrue();
  });

  it('ignora teclas que não pertencem ao radiogroup', () => {
    const fixture = TestBed.createComponent(Gallery);
    fixture.detectChanges();
    const comp = fixture.componentInstance;
    const antes = comp.produtos.selecionadoId();

    const evento = new KeyboardEvent('keydown', { key: 'a', bubbles: true, cancelable: true });
    (fixture.nativeElement as HTMLElement)
      .querySelectorAll('.galeria-card')[0]
      .dispatchEvent(evento);

    expect(comp.produtos.selecionadoId()).toBe(antes);
    expect(evento.defaultPrevented).toBeFalse();
  });

  it('não move o foco quando a seleção vem de um clique', () => {
    const fixture = TestBed.createComponent(Gallery);
    fixture.detectChanges();
    const comp = fixture.componentInstance;
    const cartoes = (fixture.nativeElement as HTMLElement).querySelectorAll('.galeria-card');

    (cartoes[1] as HTMLButtonElement).click();
    fixture.detectChanges();

    // `moverFoco` é false no caminho do clique: quem clicou já está no cartão.
    expect(comp.focoPendente()).toBeNull();
  });

  it('anuncia a peça selecionada na live region', () => {
    const fixture = TestBed.createComponent(Gallery);
    fixture.detectChanges();
    const comp = fixture.componentInstance;
    const segundo = comp.produtos.produtos()[1];

    comp.selecionar(segundo.id);
    fixture.detectChanges();

    const polite = document.getElementById('aurum-anuncio-polite');
    expect(polite?.textContent).toContain(segundo.nome);
    expect(polite?.textContent).toContain('atualizadas');
  });

  it('não anuncia quando o produto selecionado não muda', () => {
    const fixture = TestBed.createComponent(Gallery);
    fixture.detectChanges();
    const comp = fixture.componentInstance;
    const atual = comp.produtos.selecionadoId();
    const polite = document.getElementById('aurum-anuncio-polite');
    polite!.textContent = 'marca';

    comp.selecionar(atual);

    expect(polite?.textContent).toBe('marca');
  });

  it('formata o preço em BRL', () => {
    const fixture = TestBed.createComponent(Gallery);
    const comp = fixture.componentInstance;
    expect(comp.preco(18500)).toContain('18.500');
  });
});
