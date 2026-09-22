/**
 * Bot: navegação humana (pt-BR)
 * Simula um usuário real na aplicação (mouse, scroll, cliques, esperas)
 * e aquece o cache da URL de produção/homologação (mantém online).
 *
 * Uso: node bots/humano/navegacao-humana.mjs
 * Env:  BOT_URL (obrigatório) | BOT_VOLTAS (nº de navegações, opcional, padrão 3)
 */
import { chromium } from 'playwright';

const url = process.env.BOT_URL;
if (!url) {
  console.log('ℹ️ BOT_URL não definida — bot humano desativado até existir staging/produção.');
  process.exit(0);
}

const voltas = Number(process.env.BOT_VOLTAS || 3);
const browser = await chromium.launch({ headless: true });
const erros = [];

const aleatorio = (min, max) => Math.random() * (max - min) + min;
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

for (let volta = 1; volta <= voltas; volta++) {
  const contexto = await browser.newContext({
    viewport: {
      width: Math.floor(aleatorio(1280, 1920)),
      height: Math.floor(aleatorio(720, 1080)),
    },
    locale: 'pt-BR',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36',
  });
  const pagina = await contexto.newPage();

  pagina.on('console', (m) => {
    if (m.type() === 'error') erros.push(`[console] ${m.text()}`);
  });
  pagina.on('pageerror', (e) => erros.push(`[pageerror] ${e.message}`));

  try {
    console.log(`🤖 Volta ${volta}: acessando ${url}`);
    await pagina.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    await espera(aleatorio(800, 1600));

    // Movimento de "ralo" do mouse (humano)
    const palco = await pagina.viewportSize();
    for (let passo = 0; passo < 12; passo++) {
      await pagina.mouse.move(
        Math.floor(aleatorio(10, palco.width - 10)),
        Math.floor(aleatorio(10, palco.height - 10))
      );
      await espera(aleatorio(120, 420));
    }

    // Scroll lento para baixo e para cima
    for (let i = 0; i < 6; i++) {
      await pagina.mouse.wheel(0, Math.floor(aleatorio(200, 700)));
      await espera(aleatorio(300, 900));
    }
    for (let i = 0; i < 3; i++) {
      await pagina.mouse.wheel(0, -Math.floor(aleatorio(200, 600)));
      await espera(aleatorio(200, 600));
    }

    // Interage com links/CTAs (sem sair da app)
    const clicaveis = await pagina.locator('a[href]').all();
    const alvo = clicaveis[Math.floor(Math.random() * clicaveis.length)];
    if (alvo) {
      const href = await alvo.getAttribute('href');
      if (href && !href.startsWith('http')) {
        try {
          await alvo.click({ timeout: 5000 });
          await espera(aleatorio(1200, 2400));
          await pagina.goBack({ timeout: 10000 }).catch(() => {});
        } catch {
          // CTA quebrado não derruba o bot
        }
      }
    }

    const titulo = await pagina.title();
    console.log(`   ✓ Renderizado: "${titulo}"`);
  } catch (e) {
    erros.push(`[navegação] ${e.message.split('\n')[0]}`);
  }

  await contexto.close();
}

await browser.close();

if (erros.length) {
  console.error(`\n❌ Erros detectados durante a navegação: ${erros.length}`);
  for (const e of erros.slice(0, 20)) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`\n✅ ${voltas} navegações humanas concluídas sem erros.`);