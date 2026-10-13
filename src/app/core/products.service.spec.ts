import { TestBed } from '@angular/core/testing';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  let service: ProductsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProductsService);
  });

  it('disponibiliza a coleção mock', () => {
    expect(service.produtos().length).toBeGreaterThanOrEqual(6);
  });

  it('tem a primeira peça selecionada por padrão', () => {
    expect(service.selecionado().id).toBe(service.produtos()[0].id);
  });

  it('seleciona uma peça existente', () => {
    const segunda = service.produtos()[1];
    service.selecionar(segunda.id);
    expect(service.selecionadoId()).toBe(segunda.id);
    expect(service.selecionado()).toEqual(segunda);
  });

  it('ignora seleção de id inexistente ou nulo', () => {
    const atual = service.selecionadoId();
    service.selecionar(null);
    service.selecionar('id-que-nao-existe');
    expect(service.selecionadoId()).toBe(atual);
  });

  it('usa a primeira peça como fallback se a seleção for inválida', () => {
    service.selecionadoId.set('id-ilegal');
    expect(service.selecionado().id).toBe(service.produtos()[0].id);
  });
});