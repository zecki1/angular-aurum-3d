-- Aurum (Semana 5) — tabelas usadas pelo showcase de ourivesaria.
--
-- Aplicar no projeto Supabase compartilhado `angular-portfolio` (§4 do planejamento),
-- que atende todas as apps do roadmap. Esta migration é idempotente: pode ser
-- reaplicada sem efeito colateral.
--
-- Ordem de aplicação: 0001 (aqui) -> 0002_rls.sql -> ../seed.sql

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- products — a coleção da vitrine. O front consome via REST com a anon key;
-- escrita restrita ao admin (policy em 0002_rls.sql).
-- ---------------------------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric(14,2) not null check (price >= 0),
  description text,
  image_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- leads — captura de lead do CTA de contato.
--
-- O `project_slug` é obrigatório: é o que permite que um único Supabase sirva
-- aos 12 projetos do roadmap sem misturar as bases (Sem 1 = 'gta-campaign',
-- Sem 2 = 'agency', Sem 5 = 'aurum-3d').
--
-- `nome` foi adicionado ao schema-base (§4.2) porque o formulário de Aurum
-- coleta nome + e-mail; sem esta coluna o POST /rest/v1/leads responderia 400
-- (PGRST204) em produção.
-- ---------------------------------------------------------------------------
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  project_slug text not null,
  nome text,
  email text not null,
  created_at timestamptz not null default now()
);

-- Coluna `nome` para bases criadas antes desta migration.
alter table public.leads add column if not exists nome text;

-- products é lida pelo público; o índice parcial mantém a listagem barata.
create index if not exists products_active_idx
  on public.products (id) where active;

-- Nome único por produto: mantém o seed idempotente (`ON CONFLICT (name)`) e evita
-- duas linhas iguais na vitrine.
create unique index if not exists products_name_key
  on public.products (name);

-- O front sempre filtra por slug; o índice evita full scan na tabela de leads.
create index if not exists leads_project_slug_idx
  on public.leads (project_slug, created_at desc);
