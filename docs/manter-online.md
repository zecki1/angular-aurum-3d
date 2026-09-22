# Permanência online (zero standby / zero cold start)

Estratégia aplicada para manter os projetos do roadmap **sempre no ar** sem custo recorrente.

## 1. Build estático no Vercel (base)

- O Angular gera estáticos em `dist/<app>/browser`.
- Assets estáticos **nunca** entram em cold start/standby — servidos direto por CDN.
- Nenhum projeto do roadmap depende de função serverless acordando.

## 2. Backend único Supabase já gerenciado

- 1 projeto `angular-portfolio` (§4 do planejamento): Postgres + Auth + RLS 24/7 no free tier.
- Apps não têm API própria — não há VM para "aquecer".

## 3. Bot — Navegação Humana (uptime ativo)

- Workflow `.github/workflows/bot-humano.yaml` roda **a cada 4h** contra `BOT_URL`.
- Simula usuário real (mouse/scroll/cliques), **valida resposta HTTP** e erro de página,
  e **aquece o cache** do CDN/Vercel (evita eviction de recursos pouco acessados).
- Ativação: `Settings → Variables → BOT_URL` (e opcional `BOT_VOLTAS`).

## 4. Monitoramento passivo (workflow agendado)

- **Bot — Testes da Aplicação** roda a suíte todo dia 06:00 UTC e detecta regressão cedo.
- **CI** roda em todo push/PR (lint/build/unit/e2e/lighthouse) — bug não chega a `main`.

## 5. Uptime externo (opcional, gratuito)

Se quiser alerta externo independente do GitHub:

- UptimeRobot (gratuito, 50 monitores): ping na URL de produção + notificação por e-mail/Telegram.
- StatusPage/healthz: uma rota do hub (`site`) que verifica cada projeto e expõe o status agregado.

## 6. Domínio e rewrites

- Hub `zecki1.com.br` faz rewrite para cada projeto (§8.5) — deploy único e cachê de edge.
- Vercel: projeto por app; assets servidos com cache headers longos (ver `vercel.json` de cada app quando configurado).

## Resumo

| Ferramenta | Papel | Custo |
|---|---|---|
| Build estático (Vercel) | Sem cold start | Free |
| Supabase `angular-portfolio` | Backend 24/7 | Free |
| Bot humano (Actions) | Valida + aquece a cada 4h | Free |
| CI + Bot de testes | Regressão cedo | Free |
| UptimeRobot (opcional) | Alerta externo | Free |