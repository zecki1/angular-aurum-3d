import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { ClarityService } from './clarity.service';

describe('ClarityService', () => {
  let service: ClarityService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ClarityService);
    delete window.clarity;
    delete window.clarityq;
    (environment as { clarityId: string }).clarityId = '';
    document.querySelectorAll('script[src*="clarity.ms"]').forEach((s) => s.remove());
  });

  it('deve ser criado', () => {
    expect(service).toBeTruthy();
  });

  it('não injeta script quando não há projectId', () => {
    service.iniciar();
    const scripts = Array.from(document.querySelectorAll('script')).map((s) => s.src);
    expect(scripts.some((src) => src.includes('clarity.ms'))).toBeFalse();
  });

  it('injeta o loader do Clarity quando existe projectId', () => {
    (environment as { clarityId: string }).clarityId = '.abc123';
    service.iniciar();
    const scripts = Array.from(document.querySelectorAll('script')).map((s) => s.src);
    expect(scripts.some((src) => src.includes('clarity.ms/tag/.abc123'))).toBeTrue();
  });

  it('não injeta o loader duas vezes', () => {
    (environment as { clarityId: string }).clarityId = '.abc123';
    service.iniciar();
    service.iniciar();
    const totals = Array.from(document.querySelectorAll('script')).filter((s) =>
      s.src.includes('clarity.ms/tag/.abc123'),
    );
    expect(totals.length).toBe(1);
  });
});