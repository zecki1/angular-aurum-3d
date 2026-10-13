import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

export interface Lead {
  nome: string;
  email: string;
}

/** Campo blamed no erro — o formulário marca `aria-invalid` só nele. */
export type CampoLead = 'nome' | 'email' | 'formulario';

export interface ResultadoLead {
  ok: boolean;
  mensagem?: string;
  /** Ausente quando o erro não é de um campo específico (ex.: falha de rede). */
  campo?: CampoLead;
}

export const TAMANHO_MINIMO_NOME = 2;

/** Regex simples de e-mail (mesmo padrão dos outros projetos). */
export function emailValido(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

const CHAVE_LOCAL = 'zecki1-aurum-leads';

@Injectable({ providedIn: 'root' })
export class LeadService {
  /**
   * Captura o lead.
   * - Modo demo (sem `supabaseUrl`): grava localmente (localStorage) e simula latência.
   * - Modo backend (URL + anon key): envia via REST do Supabase (fetch) — evita o client
   *   inteiro na pegada do bundle (melhor para o budget apertado de three.js).
   */
  async cadastrar(lead: Lead): Promise<ResultadoLead> {
    const nome = lead.nome.trim();
    const email = lead.email.trim();

    if (nome.length < TAMANHO_MINIMO_NOME) {
      return {
        ok: false,
        campo: 'nome',
        mensagem: 'Informe um nome com pelo menos 2 caracteres.',
      };
    }
    if (!emailValido(email)) {
      return {
        ok: false,
        campo: 'email',
        mensagem: 'Informe um e-mail válido, como nome@exemplo.com.',
      };
    }

    if (environment.supabaseUrl) {
      try {
        await this.enviarParaSupabase(nome, email);
      } catch {
        return {
          ok: false,
          campo: 'formulario',
          mensagem: 'Não foi possível enviar agora. Tente de novo.',
        };
      }
    } else {
      await this.simularLatencia();
      this.gravarLocal(nome, email);
    }

    return { ok: true };
  }

  listaLocal(): Lead[] {
    const cru = localStorage.getItem(CHAVE_LOCAL);
    if (!cru) return [];
    try {
      const dados = JSON.parse(cru) as Lead[];
      return Array.isArray(dados)
        ? dados.filter((d) => d && typeof d.nome === 'string' && typeof d.email === 'string')
        : [];
    } catch {
      return [];
    }
  }

  private gravarLocal(nome: string, email: string): void {
    const atual = this.listaLocal();
    const proxima = [...atual, { nome, email }];
    localStorage.setItem(CHAVE_LOCAL, JSON.stringify(proxima));
  }

  private async simularLatencia(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 180));
  }

  private async enviarParaSupabase(nome: string, email: string): Promise<void> {
    const resposta = await fetch(`${environment.supabaseUrl}/rest/v1/leads`, {
      method: 'POST',
      headers: {
        apikey: environment.supabaseAnonKey,
        Authorization: `Bearer ${environment.supabaseAnonKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        project_slug: environment.supabaseProjectSlug,
        nome,
        email,
      }),
    });
    if (!resposta.ok) {
      throw new Error(`Supabase respondeu ${resposta.status}`);
    }
  }
}