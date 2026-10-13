import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * O app é uma página única (rotas `''` e `'**'`): a varredura cobre a home e um
 * estado relevante — o hub de acessibilidade aberto, que injeta um diálogo
 * inteiro (radios, switches, botões de fonte) na árvore.
 */
const PAGINAS: Array<{ nome: string; path: string; preparar?: (page: Page) => Promise<void> }> = [
  { nome: 'home', path: '/' },
  {
    nome: 'home-hub-aberto',
    path: '/',
    preparar: async (page) => {
      await page.locator('.hub-botao').click();
      await expect(page.locator('#hub-acessibilidade')).not.toHaveAttribute('aria-hidden', 'true');
    },
  },
];

/**
 * O axe lê cores computadas: rodar no meio de uma transição de `opacity` faz ele
 * medir o texto do hub "borrado" com o fundo (#2e2c2a sobre #0c0a09, 1.42:1) e
 * acusar color-contrast falso-positivo. Por isso esperamos as animações pararem
 * antes de auditar — na CI, mais lenta que a máquina local, isso é obrigatório.
 */
async function aguardarEstabilizar(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page
    .waitForFunction(
      () => {
        const painel = document.querySelector('#hub-acessibilidade');
        if (!painel) return true;
        return Number.parseFloat(getComputedStyle(painel).opacity) >= 1;
      },
      undefined,
      { timeout: 5000 },
    )
    .catch(() => undefined);
  // A transição do painel é `opacity/transform 0.25s`: a folga cobre o resto.
  await page.waitForTimeout(500);
}

test.describe('acessibilidade (axe)', () => {
  test('gera relatório e falha em violações graves/críticas', async ({ page }) => {
    test.setTimeout(180_000);
    const relatorio: Array<Record<string, unknown>> = [];

    for (const pagina of PAGINAS) {
      await page.goto(pagina.path);
      await pagina.preparar?.(page);
      await aguardarEstabilizar(page);

      const resultados = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      const graves = resultados.violations.filter(
        (v) => v.impact === 'serious' || v.impact === 'critical',
      );

      relatorio.push({
        pagina: pagina.nome,
        url: pagina.path,
        violacoes: resultados.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          descricao: v.help,
          nos: v.nodes.length,
        })),
        passes: resultados.passes.length,
        graves: graves.length,
      });

      expect(
        graves,
        `violações graves/críticas em ${pagina.nome} (${pagina.path}): ${graves.map((v) => v.id).join(', ')}`,
      ).toEqual([]);
    }

    mkdirSync('docs/a11y', { recursive: true });
    writeFileSync(
      join('docs/a11y', 'relatorio-axe.json'),
      `${JSON.stringify(relatorio, null, 2)}\n`,
      'utf8',
    );
  });
});
