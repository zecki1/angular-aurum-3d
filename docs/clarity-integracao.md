# Integração Microsoft Clarity (mapa de calor)

O Clarity grava **mapas de calor, scroll, cliques e sessões** para validar a UX do projeto. Roda em produção/homologação (nos estáticos do Vercel).

## 1. Criar o projeto no Clarity

1. Acesse https://clarity.microsoft.com/projects/new
2. Nome: siga o padrão `zecki-<projeto>` (ex.: `zecki-vice-district`)
3. Copie o **Project ID** (o valor que aparece em `clarity.ms/tag/XXXXXXXX`)

## 2. Configurar a variável

Cada ambiente que receber o Clarity precisa do ID como variável de build:

```
CLARITY_PROJECT_ID=xxxxxxxx
```

Na Vercel: *Settings → Environment Variables → CLARITY_PROJECT_ID*.
Localmente: adicionar ao `.env` (nunca commitar — ver `.env.example`).

## 3. Injeta o snippet no app

Adicione no `index.html` (ou via serviço de bootstrap) antes do `</body>`:

```html
<script type="text/javascript">
  (function(c,l,a,r,i,t,y){
    c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
    t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
    y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
  })(window, document, "clarity", "script", "SEU_PROJECT_ID_AQUI");
</script>
```

> Troque `SEU_PROJECT_ID_AQUI` pelo valor de `CLARITY_PROJECT_ID`.
> Em produção o snippet só deve ser carregado se o ID estiver definido (evite load inválido).

## 4. Verificação

- **Console** (produção): rede → requisição para `clarity.ms/tag/*` retornando 200.
- **Painel Clarity**: dashboard do projeto com sessões e heatmaps gravando.
- DP: não precisa de consentimento explícito em RGPD, mas respeite o banner de cookies caso o hub exija.

## 5. Bot humano + Clarity

O **Bot — Navegação Humana** gera sessões reais (mouse/scroll/cliques), o que alimenta o mapa de calor
com dados úteis mesmo antes de tráfego real. Configure `BOT_URL` (Settings → Variables) e o Clarity captura as sessões do bot.