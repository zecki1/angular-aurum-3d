-- Aurum (Semana 5) — seed da coleção de ourivesaria.
--
-- Rodar depois de 0001_products_leads.sql e 0002_rls.sql, no SQL Editor do projeto
-- `angular-portfolio` ou via `supabase db seed`. Idempotente por `name` (ON CONFLICT).
--
-- Os produtos espelham o mock de `src/app/core/products.service.ts` (ids `aurum-n1`…
-- `aurum-n6`), para que a troca mock -> Supabase não mude o que a vitrine mostra.

insert into public.products (name, price, description, active)
select p.name, p.price, p.description, true
from (values
  ('Aurum Nº 1 Escultura',   18500.00, 'Escultura em ouro 18k, tiragem de 12 exemplares', true),
  ('Aurum Nº 2 Anel',         4200.00, 'Anel em ouro 18k com textura martelada',          true),
  ('Aurum Nº 3 Pingente',     6800.00, 'Pingente em ouro rosé, corrente fina',         true),
  ('Aurum Nº 4 Manilha',     12400.00, 'Manilha em platina, acabamento espelhado',     true),
  ('Aurum Nº 5 Brincos',      5600.00, 'Brincos em ouro 18k, pares simétricos',         true),
  ('Aurum Nº 6 Escultura',   21900.00, 'Escultura em ouro 18k, base em mármore',         true)
) as p(name, price, description, active)
on conflict (name) do nothing;
