-- Aurum (Semana 5) — Row Level Security de `products` e `leads` (§4.3 do planejamento).
--
-- Regras do projeto:
--   products: leitura pública (a vitrine é o produto); escrita só `admin`.
--   leads:    o formulário anônimo precisa inserir, mas NENHUM `user`/`viewer`
--             enxerga a base — só `admin`/`analyst` listam, para não vazar os
--             e-mails capturados.

alter table public.products enable row level security;
alter table public.leads enable row level security;

-- Helper: role do usuário autenticado, lido do próprio profile.
-- SECURITY DEFINER evita recursão de RLS (a policy de `profiles` consulta `profiles`).
create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------------
drop policy if exists "products: leitura pública" on public.products;
create policy "products: leitura pública"
  on public.products
  for select
  using (active = true);

drop policy if exists "products: admin escreve" on public.products;
create policy "products: admin escreve"
  on public.products
  for all
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

-- ---------------------------------------------------------------------------
-- leads
-- ---------------------------------------------------------------------------
-- Anônimo pode enviar o próprio lead, mas só para o slug deste projeto.
-- `with check` é o que impede um cliente de forjar `project_slug` de outro app.
drop policy if exists "leads: envio anônimo" on public.leads;
create policy "leads: envio anônimo"
  on public.leads
  for insert
  with check (project_slug = 'aurum-3d');

drop policy if exists "leads: leitura só admin/analyst" on public.leads;
create policy "leads: leitura só admin/analyst"
  on public.leads
  for select
  using (public.current_role() in ('admin', 'analyst'));

drop policy if exists "leads: remoção só admin/analyst" on public.leads;
create policy "leads: remoção só admin/analyst"
  on public.leads
  for delete
  using (public.current_role() in ('admin', 'analyst'));
