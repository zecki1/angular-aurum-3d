import { chromium } from '@playwright/test';
import fs from 'node:fs';

/**
 * Baselines de screenshot do README.
 * Uso: `npm run e2e:screenshots` com o `ng serve` no ar (ou E2E_BASE_URL apontando
 * para outro ambiente). Rola a página inteira antes de capturar para o AOS revelar
 * as seções — sem isso, metade das imagens sai vazia.
 */
const base = process.env.E2E_BASE_URL || 'http://localhost:4200';
const out = 'docs/screenshots';
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const erros = [];

async function rolarTudo(page) {
  const altura = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < altura; y += 700) {
    await page.evaluate((v) => window.scrollTo(0, v), y);
    await page.waitForTimeout(160);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(600);
}

async function abrir(nome, viewport) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  page.on('console', (m) => {
    if (m.type() === 'error') erros.push(`[${nome}] ${m.text()}`);
  });
  page.on('pageerror', (e) => erros.push(`[${nome}] pageerror: ${e.message}`));
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  return page;
}

const desktop = await abrir('desktop', { width: 1440, height: 900 });
await rolarTudo(desktop);
await desktop.screenshot({ path: `${out}/home-desktop.png` });
await desktop.screenshot({ path: `${out}/home-full.png`, fullPage: true });

for (const id of ['cena', 'galeria', 'atelier', 'materiais', 'contato']) {
  await desktop.locator(`#${id}`).scrollIntoViewIfNeeded();
  await desktop.waitForTimeout(800);
  await desktop.locator(`#${id}`).screenshot({ path: `${out}/${id}.png` });
}

const mobile = await abrir('mobile', { width: 390, height: 844 });
await rolarTudo(mobile);
await mobile.screenshot({ path: `${out}/home-mobile.png` });
await mobile.screenshot({ path: `${out}/home-mobile-full.png`, fullPage: true });

console.log(erros.length ? `erros de console:\n${erros.join('\n')}` : 'sem erros de console');
await browser.close();
