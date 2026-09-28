# Supabase — Aurum

Tabelas usadas por este app: **`products`** (coleção da vitrine) + **`leads`** (CTA de contato).

As migrations são aplicadas no projeto Supabase **compartilhado** `angular-portfolio`, que
atende todas as apps do roadmap (§4 do planejamento). O mesmo schema serve à Sem 1
(`gta-campaign`), Sem 2 (`agency`) e Sem 5 (`aurum-3d`) — o que separa as bases é a coluna
`project_slug`, nunca uma tabela por projeto.

## Arquivos

| Arquivo | O que faz |
|---|---|
| `migrations/0001_products_leads.sql` | Tabelas `products` e `leads`, índice único de nome, `created_at`, coluna `nome` em `leads` |
| `migrations/0002_rls.sql` | RLS: `products` leitura pública / escrita `admin`; `leads` insert anônimo no slug, leitura só `admin`/`analyst` |
| `seed.sql` | 6 produtos da coleção Aurum (espelha o mock de `products.service.ts`) |

## Aplicar

```bash
# 1) no SQL Editor do projeto angular-portfolio, na ordem:
#    migrations/0001_products_leads.sql
#    migrations/0002_rls.sql
#    seed.sql
#
# 2) configure o front (nunca comite as chaves):
#    copie .env.example para .env e preencha VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
```

Depois de `.env` preenchido, `npm run env` regenera `src/environments/ambiente.local.ts` e o
`LeadService` passa a gravar no Supabase em vez do `localStorage`.

## Por que o front usa `fetch` e não `@supabase/supabase-js`

O `LeadService` faz `POST /rest/v1/leads` com `fetch` puro. O bundle inicial desta app é
orçado em 500 kB e o chunk do three.js já custa ~597 kB; carregar o client do Supabase para
uma única inserção não se pagava. Mesma decisão vale para a Sem 3 (Ledger), onde o client
entra por genuinely precisar de Auth e de realtime.

## Decisões de RLS

- **`leads` não é legível por `user`/`viewer`.** Os e-mails capturados são dado pessoal; só
  `admin` e `analyst` listam. `user` e `viewer` não recebem nenhuma policy de `select`.
- **O insert anônimo é travado por `with check (project_slug = 'aurum-3d')`.** Sem isso, um
  cliente poderia forjar o slug de outro app do roadmap e poluir a base alheia.
- **`current_role()` é `SECURITY DEFINER`.** A policy de `profiles` consulta `profiles`; sem o
  `security definer` isso entraria em recursão de RLS.
