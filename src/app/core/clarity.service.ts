import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

type ClarityFn = (...args: unknown[]) => void;

declare global {
  interface Window {
    clarity?: ClarityFn;
    clarityq?: unknown[][];
  }
}

@Injectable({ providedIn: 'root' })
export class ClarityService {
  private iniciado = false;

  /** Inicia o Microsoft Clarity usando o snippet oficial (IIFE do loader). */
  iniciar(): void {
    const clarityId = environment.clarityId?.trim();
    if (!clarityId || this.iniciado) return;
    this.iniciado = true;

    const c = window as Window;
    if (typeof c.clarity !== 'function') {
      c.clarity = function (...args: unknown[]) {
        (c.clarityq = c.clarityq || []).push(args);
      } as ClarityFn;
      c.clarity('script', Date.now());
    }

    const script = document.createElement('script');
    script.async = true;
    script.type = 'text/javascript';
    script.src = `https://www.clarity.ms/tag/${clarityId}`;
    const head = document.getElementsByTagName('head')[0];
    head.insertBefore(script, head.firstChild);
  }
}