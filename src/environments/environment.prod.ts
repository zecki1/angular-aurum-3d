import { ambienteLocal } from './ambiente.local';

/**
 * Ambiente de produção. Mesmas chaves do `environment.ts`, preenchidas pelas
 * variáveis de ambiente do Vercel no momento do build (§5 do planejamento).
 */
export const environment = {
  production: true,
  supabaseUrl: ambienteLocal['VITE_SUPABASE_URL'] ?? '',
  supabaseAnonKey: ambienteLocal['VITE_SUPABASE_ANON_KEY'] ?? '',
  supabaseProjectSlug: ambienteLocal['VITE_SUPABASE_PROJECT_SLUG'] ?? 'aurum-3d',
  clarityId: ambienteLocal['CLARITY_PROJECT_ID'] ?? '',
};
