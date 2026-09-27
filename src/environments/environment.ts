import { ambienteLocal } from './ambiente.local';

/**
 * Ambiente de desenvolvimento. As chaves vêm de `src/environments/ambiente.local.ts`,
 * gerado por `scripts/gerar-ambiente.mjs` a partir do `.env` (gitignored).
 *
 * Sem `VITE_SUPABASE_URL` a app roda em modo demo: os leads ficam no localStorage
 * e a coleção de produtos no mock local — o front nunca trava por falta de backend.
 */
export const environment = {
  production: false,
  supabaseUrl: ambienteLocal['VITE_SUPABASE_URL'] ?? '',
  supabaseAnonKey: ambienteLocal['VITE_SUPABASE_ANON_KEY'] ?? '',
  supabaseProjectSlug: ambienteLocal['VITE_SUPABASE_PROJECT_SLUG'] ?? 'aurum-3d',
  clarityId: ambienteLocal['CLARITY_PROJECT_ID'] ?? '',
};
