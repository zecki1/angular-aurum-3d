import { TestBed } from '@angular/core/testing';
import { emailValido, LeadService, TAMANHO_MINIMO_NOME } from './lead.service';
import { environment } from '../../environments/environment';

describe('emailValido', () => {
  it('aceita e-mails válidos', () => {
    expect(emailValido('ana@exemplo.com')).toBeTrue();
    expect(emailValido('zecki+projeto@gmail.com')).toBeTrue();
  });

  it('rejeita e-mails sem domínio ou com espaços', () => {
    expect(emailValido('ana@')).toBeFalse();
    expect(emailValido('ana@exemplo')).toBeFalse();
    expect(emailValido('ana exemplo.com')).toBeFalse();
    expect(emailValido('')).toBeFalse();
  });
});

describe('LeadService (modo demo)', () => {
  let service: LeadService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(LeadService);
  });

  it('valida o tamanho mínimo do nome', async () => {
    const resultado = await service.cadastrar({ nome: 'A', email: 'ana@exemplo.com' });
    expect(resultado.ok).toBeFalse();
    expect(TAMANHO_MINIMO_NOME).toBe(2);
  });

  it('rejeita e-mail inválido', async () => {
    const resultado = await service.cadastrar({ nome: 'Ana', email: 'sem-arroba' });
    expect(resultado.ok).toBeFalse();
    expect(resultado.mensagem).toContain('e-mail');
  });

  it('captura e grava localmente no modo demo', async () => {
    const antes = service.listaLocal().length;
    const resultado = await service.cadastrar({ nome: 'Ana', email: 'ana@exemplo.com' });
    expect(resultado.ok).toBeTrue();
    expect(service.listaLocal().length).toBe(antes + 1);
    expect(service.listaLocal()).toContain(jasmine.objectContaining({ email: 'ana@exemplo.com' }));
  });

  it('ignora entradas corrompidas na leitura local', () => {
    localStorage.setItem('zecki1-aurum-leads', '[{"nome":"Ok"}, null, "texto", {"nome":"B","email":"b@c.com"}]');
    const lista = service.listaLocal();
    expect(lista.length).toBe(1);
    expect(lista[0].email).toBe('b@c.com');
  });

  it('retorna lista vazia quando o JSON local é inválido', () => {
    localStorage.setItem('zecki1-aurum-leads', 'isto não é { json');
    expect(service.listaLocal()).toEqual([]);
  });
});

describe('LeadService (modo backend/Supabase)', () => {
  let service: LeadService;
  let fetchSpy: jasmine.Spy;
  const urlOriginal = environment.supabaseUrl;
  const anonOriginal = environment.supabaseAnonKey;
  const slugOriginal = environment.supabaseProjectSlug;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(LeadService);
    fetchSpy = spyOn(window, 'fetch');
    environment.supabaseUrl = 'https://mock.supabase.co';
    environment.supabaseAnonKey = 'chave-anon';
    environment.supabaseProjectSlug = 'aurum';
  });

  afterEach(() => {
    environment.supabaseUrl = urlOriginal;
    environment.supabaseAnonKey = anonOriginal;
    environment.supabaseProjectSlug = slugOriginal;
  });

  it('envia o lead via REST quando há URL do Supabase', async () => {
    fetchSpy.and.returnValue(Promise.resolve(new Response(null, { status: 201 })));
    const resultado = await service.cadastrar({ nome: 'Ana', email: 'ana@exemplo.com' });
    expect(resultado.ok).toBeTrue();
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://mock.supabase.co/rest/v1/leads',
      jasmine.objectContaining({ method: 'POST' }),
    );
  });

  it('trata resposta de erro do Supabase', async () => {
    fetchSpy.and.returnValue(Promise.resolve(new Response(null, { status: 500 })));
    const resultado = await service.cadastrar({ nome: 'Ana', email: 'ana@exemplo.com' });
    expect(resultado.ok).toBeFalse();
    expect(resultado.mensagem).toContain('Não foi possível');
  });

  it('trata falha de rede no envio', async () => {
    fetchSpy.and.returnValue(Promise.reject(new Error('offline')));
    const resultado = await service.cadastrar({ nome: 'Ana', email: 'ana@exemplo.com' });
    expect(resultado.ok).toBeFalse();
  });
});