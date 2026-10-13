import { test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * O app é uma página única com seções navegáveis por âncora:
 * `#cena` (three.js), `#specs`, `#galeria` e `#contato`.
 * `inteira: true` = página toda; `alvo` = print só da seção.
 */
const PAGINAS: Array<{ nome: string; path: string; alvo?: string; inteira?: boolean }> = [
  { nome: 'home', path: '/', inteira: true },
  { nome: 'cena-3d', path: '/', alvo: '#cena' },
  { nome: 'galeria', path: '/', alvo: '#galeria' },
  { nome: 'contato', path: '/', alvo: '#contato' },
];

const VIEWPORTS = [
  { nome: 'desktop', width: 1440, height: 900 },
  { nome: 'mobile', width: 390, height: 844 },
];

const SAIDA = join('docs', 'screenshots');

/**
 * Espera o preloader/animações assentarem antes do print. A cena three.js é
 * render-on-demand e compila shaders no primeiro frame — por isso o intervalo
 * extra depois que o canvas aparece.
 */
async function aguardarEstabilizar(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page
    .locator('[data-preloader]')
    .waitFor({ state: 'detached', timeout: 8000 })
    .catch(() => undefined);
  await page
    .locator('.cena canvas')
    .waitFor({ state: 'visible', timeout: 20_000 })
    .catch(() => undefined);
  await page.waitForTimeout(2500);
}

test.describe('screenshots (baselines do README)', () => {
  test.describe.configure({ timeout: 120_000 });

  for (const viewport of VIEWPORTS) {
    test.describe(viewport.nome, () => {
      test.use({ viewport: { width: viewport.width, height: viewport.height } });

      for (const pagina of PAGINAS) {
        test(`${pagina.nome} ${viewport.nome}`, async ({ page }) => {
          mkdirSync(SAIDA, { recursive: true });
          await page.goto(pagina.path);
          await aguardarEstabilizar(page);

          const caminho = join(SAIDA, `${pagina.nome}-${viewport.nome}.jpg`);

          if (pagina.alvo) {
            const alvo = page.locator(pagina.alvo);
            await alvo.scrollIntoViewIfNeeded();
            await page.waitForTimeout(1000);
            await alvo.screenshot({ path: caminho, type: 'jpeg', quality: 80 });
            return;
          }

          await page.screenshot({
            path: caminho,
            fullPage: true,
            type: 'jpeg',
            quality: 80,
          });
        });
      }
    });
  }
});
