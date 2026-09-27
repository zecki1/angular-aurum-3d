# Case study — Aurum

> Semana 5 · Pilar **Showcase** · Unit **Karma** · Milestone `m1-aurum`
> Repo: [github.com/zecki1/angular-aurum-3d](https://github.com/zecki1/angular-aurum-3d)

## Contexto

Ourivesaria fictícia vendendo uma coleção de seis peças em ouro. O briefing era mostrar o
produto como um objeto de valor, não como um card de e-commerce: a peça precisa ser
inspecionável antes de qualquer preço aparecer.

## Desafio

Entregar **three.js dentro do orçamento de bundle do Angular 22**. Um `import * as THREE`
no topo do `main.ts` já estoura o budget de 500 kB só no three, antes de qualquer lógica de
negócio. E a cena não pode ser um enfeite: precisa ser operável por teclado e por leitor de
tela, porque é o único lugar da página onde o produto aparece.

## Solução

- **Chunk sob demanda.** `import('three')`, `import('three/examples/jsm/controls/OrbitControls.js')`
  e `RoomEnvironment` são dinâmicos. Resultado: chunk lazy de ~597 kB, initial de ~445 kB
  (budget: 500 kB). O WebGL só baixa quando a cena monta.
- **Render on demand.** Um único `requestAnimationFrame`; ocioso a ~16 fps, interação
  frame-a-frame, `IntersectionObserver` pausa fora da viewport, e frames são pulados com a
  aba oculta. O `dpr` é limitado a 2. `contagemRender()` expõe os frames reais — é assim que
  o teste mede o comportamento, sem spy.
- **Cena como interface.** `CenaMontada` (`limpar`, `girar`, `inclinar`, `aproximar`, `repor`,
  `definirPausado`, `contagemRender`) desacopla o componente do three.js. O `ProductScene`
  fala com a cena por contrato, o que torna a spec unitária em `ChromeHeadless` determinística.
- **Acessibilidade da cena.** O `<canvas>` é `role="img"` com `aria-label` descritivo, `tabindex="0"`
  e `aria-describedby` apontando para as instruções. Setas giram/inclinam, `+`/`-` dão zoom,
  `Home` reframe. Botão de pausa com `aria-pressed` atende ao WCAG 2.2.2.
- **Backend no fim de semana.** `products` + `leads` no Supabase compartilhado
  `angular-portfolio`, com RLS: vitrine pública, escrita só `admin`; lead anônimo entra
  preso ao `project_slug = 'aurum-3d'` e **ninguém** com role `user`/`viewer` consegue ler.

## Métricas

| Métrica | Valor |
|---|---|
| Bundle inicial | ~445 kB (budget 500 kB) |
| Chunk lazy three.js | ~597 kB (carregado só ao montar a cena) |
| Unit (Karma) | 121/121 · statements 95,11% · branches 86,28% · functions 92,24% · lines 98,1% |
| E2E (Playwright + axe) | 14 testes · 0 violações críticas/sérias |
| Lighthouse | pendente (rodar em hospedagem) |

## O que aprendi

- `import.meta.env` **não existe** no builder `@angular/build:application` — só via `define`,
  que exige literais em `angular.json`. Para manter o contrato `VITE_*` sem commitar chave,
  o projeto gera `src/environments/ambiente.local.ts` a partir do `.env` antes do build.
- Testar WebGL em headless tem duas armadilhas: canvas fora do DOM reporta
  `isIntersecting: false` (congela o render) e `document.hidden` invalida testes de
  visibilidade. Stubs explícitos resolvem — e deixam o caminho determinístico.
- `environment` são data-properties comuns, então `spyOnProperty('get')` não funciona;
  mutar e restaurar no `afterEach` é o caminho para cobrir o branch de Supabase.
- O `leads` do schema compartilhado não tinha `nome`. Schema que serve 12 apps precisa de
  migration de evolução, não só de criação — e a policy de insert precisa ser presa ao
  `project_slug` para que um app não-polue a base de outro.

## Links

- Demo: _pendente de publicação (fase "produção", §5 do planejamento)_
- Repo: https://github.com/zecki1/angular-aurum-3d
- Migrations/RLS/seed: [`../supabase/README.md`](../supabase/README.md)
