import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/** Erros que uma auditoria de acessibilidade não pode deixar passar. */
const IMPACTOS_BLOQUEANTES = ['critical', 'serious'] as const;

/** Erros que valem acompanhar, mas não reprovam a entrega sozinhos. */
const IMPACTOS_MONITORADOS = ['moderate', 'minor'] as const;

async function auditar(page: Page) {
  return new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .analyze();
}

test.describe('Aurum — fluxo principal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('carrega a cena 3D com canvas acessível', async ({ page }) => {
    await expect(page).toHaveTitle(/Aurum/);
    await expect(page.locator('.cena canvas')).toBeVisible();
    await expect(page.locator('.intro-titulo')).toContainText('OURO');

    // A peça é o conteúdo principal: o canvas carrega nome e descrição.
    const canvas = page.locator('.cena canvas');
    await expect(canvas).toHaveAttribute('role', 'img');
    await expect(canvas).toHaveAttribute('tabindex', '0');
    const rotulo = await canvas.getAttribute('aria-label');
    expect(rotulo).toContain('Aurum');
    expect(rotulo).toContain('Ouro 18k');
  });

  test('galeria: seleciona produto com o mouse', async ({ page }) => {
    const primeiro = page.locator('.galeria-card').nth(0);
    await expect(primeiro).toHaveAttribute('aria-checked', 'true');

    const segundo = page.locator('.galeria-card').nth(1);
    await segundo.click();

    await expect(segundo).toHaveAttribute('aria-checked', 'true');
    await expect(primeiro).toHaveAttribute('aria-checked', 'false');
    await expect(page.locator('.cena-peca')).toContainText('Aurum Nº 2');
    await expect(page.locator('.specs-peca')).toContainText('Aurum Nº 2');
  });

  test('galeria: navega com setas e roving tabindex', async ({ page }) => {
    const primeiro = page.locator('.galeria-card').nth(0);
    await primeiro.focus();
    await expect(primeiro).toHaveAttribute('tabindex', '0');

    // A seta para a direita move a seleção e o foco — um item por vez no grupo.
    await page.keyboard.press('ArrowRight');
    const segundo = page.locator('.galeria-card').nth(1);
    await expect(segundo).toHaveAttribute('aria-checked', 'true');
    await expect(segundo).toBeFocused();
    await expect(segundo).toHaveAttribute('tabindex', '0');
    await expect(primeiro).toHaveAttribute('tabindex', '-1');

    // Setas no grupo são tratadas: o default (rolar a página) é cancelado.
    const rolou = await page.evaluate(() => {
      const evento = new KeyboardEvent('keydown', { key: 'ArrowRight', cancelable: true });
      document.activeElement?.dispatchEvent(evento);
      return evento.defaultPrevented;
    });
    expect(rolou).toBe(true);

    // Home/End vão às pontas.
    await page.keyboard.press('End');
    const ultimo = page.locator('.galeria-card').last();
    await expect(ultimo).toHaveAttribute('aria-checked', 'true');
    await page.keyboard.press('Home');
    await expect(primeiro).toHaveAttribute('aria-checked', 'true');

    // Um único item do grupo é tabulável.
    await primeiro.press('Tab');
    await expect(page.locator('.galeria-card').nth(1)).not.toBeFocused();
  });

  test('galeria: a troca é anunciada para leitor de tela', async ({ page }) => {
    await page.locator('.galeria-card').nth(2).click();
    await expect(page.locator('#aurum-anuncio-polite')).toContainText('Aurum Nº 3');
  });

  test('cena 3D: pausa e retoma pelo teclado', async ({ page }) => {
    const canvas = page.locator('.cena canvas');
    await canvas.focus();
    await expect(page.locator('.cena-pausa')).toHaveAttribute('aria-pressed', 'false');

    // Setas giram a peça sem roubar a rolagem da página nem o foco.
    const tratado = await page.evaluate(() => {
      const evento = new KeyboardEvent('keydown', { key: 'ArrowRight', cancelable: true });
      document.activeElement?.dispatchEvent(evento);
      return evento.defaultPrevented;
    });
    expect(tratado).toBe(true);
    await expect(canvas).toBeFocused();

    await page.locator('.cena-pausa').click();
    await expect(page.locator('.cena-pausa')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.cena-pausa')).toContainText('Retomar');
    await expect(page.locator('#aurum-anuncio-polite')).toContainText('pausada');

    await page.locator('.cena-pausa').click();
    await expect(page.locator('.cena-pausa')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('#aurum-anuncio-polite')).toContainText('retomada');
  });

  test('cena 3D: nasce pausada quando o sistema pede movimento reduzido', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');

    // WCAG 2.2.2: nada se move sozinho sem que o usuário tenha pedido.
    await expect(page.locator('.cena-pausa')).toHaveAttribute('aria-pressed', 'true');

    // E o hub diz a verdade: o switch continua "desligado" (é a preferência
    // salva), mas a descrição avisa que o sistema já segurou a animação.
    await page.locator('.hub-botao').click();
    const reduzir = page.locator('.hub-toggle').nth(2);
    await expect(reduzir).toHaveAttribute('aria-checked', 'false');
    const descrito = await reduzir.getAttribute('aria-describedby');
    await expect(page.locator(`#${descrito}`)).toContainText('sistema já pede movimento reduzido');

    // E o teclado ainda move a peça: pausado não é "travado".
    await page.locator('.cena canvas').focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('.cena-pausa')).toHaveAttribute('aria-pressed', 'true');
  });

  test('hub: abre, opera e fecha só pelo teclado', async ({ page }) => {
    const gatilho = page.locator('.hub-botao');
    const painel = page.locator('#hub-acessibilidade');

    // Fechado, o painel não pode estar no caminho de tabulação nem exposto.
    await expect(painel).toHaveAttribute('aria-hidden', 'true');

    await gatilho.focus();
    await page.keyboard.press('Enter');
    await expect(painel).not.toHaveAttribute('aria-hidden', 'true');
    await expect(painel).toHaveAttribute('role', 'dialog');
    await expect(gatilho).toHaveAttribute('aria-expanded', 'true');
    // O foco entra no diálogo (no fechar) — o leitor de tela ancoram o contexto.
    await expect(painel.locator('.hub-fechar')).toBeFocused();

    // Tab alcança o grupo de visão; só a opção selecionada é tabulável.
    const radios = painel.locator('.hub-radio-input');
    const primeiro = radios.nth(0);
    await primeiro.focus();
    await expect(primeiro).toHaveAttribute('tabindex', '0');
    await expect(radios.nth(1)).toHaveAttribute('tabindex', '-1');

    // As setas trocam o modo de visão dentro do radiogroup.
    await page.keyboard.press('ArrowRight');
    await expect(radios.nth(1)).toBeFocused();
    await expect(radios.nth(1)).toBeChecked();
    await expect(page.locator('html')).toHaveClass(/modo-monocromatico/);

    // Escape fecha e devolve o foco ao gatilho.
    await page.keyboard.press('Escape');
    await expect(painel).toHaveAttribute('aria-hidden', 'true');
    await expect(gatilho).toBeFocused();

    // E o painel fechado não é mais tabulável.
    await gatilho.press('Tab');
    await expect(painel.locator('.hub-fechar')).not.toBeFocused();
  });

  test('hub: aumenta o texto e anuncia o novo tamanho', async ({ page }) => {
    await page.locator('.hub-botao').click();

    const tamanhoInicial = await page.evaluate(() =>
      Number.parseInt(getComputedStyle(document.documentElement).fontSize, 10),
    );

    await page.locator('.hub-fonte-botao').nth(1).click();
    await expect(page.locator('#aurum-anuncio-polite')).toContainText('17 pixels');

    const tamanhoFinal = await page.evaluate(() =>
      Number.parseInt(getComputedStyle(document.documentElement).fontSize, 10),
    );
    expect(tamanhoFinal).toBeGreaterThan(tamanhoInicial);

    // A opção de alto contraste é um switch, não um checkbox disfarçado.
    const alto = page.locator('.hub-toggle').first();
    await expect(alto).toHaveAttribute('role', 'switch');
    await expect(alto).toHaveAttribute('aria-checked', 'false');
    await alto.click();
    await expect(alto).toHaveAttribute('aria-checked', 'true');
    await expect(page.locator('html')).toHaveClass(/alto-contraste/);
  });

  test('captura um lead com nome e e-mail válidos', async ({ page }) => {
    await page.locator('#leads-nome').fill('Ana Souza');
    await page.locator('#leads-email').fill('ana@exemplo.com');
    await page.locator('.leads-botao').click();

    await expect(page.locator('.leads-sucesso')).toBeVisible();
    // O sucesso recebe foco e é anunciado.
    await expect(page.locator('.leads-sucesso')).toBeFocused();
  });

  test('rejeita lead com e-mail inválido e aponta o campo', async ({ page }) => {
    await page.locator('#leads-nome').fill('Ana Souza');
    await page.locator('#leads-email').fill('sem-arroba');
    await page.locator('.leads-botao').click();

    const email = page.locator('#leads-email');
    await expect(email).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('.leads-erro-campo')).toBeVisible();
    await expect(page.locator('.leads-erro-campo')).toContainText('e-mail');

    // O erro fica ligado ao campo por aria-describedby.
    const descrito = await email.getAttribute('aria-describedby');
    expect(descrito).toBe('leads-erro-email');
    await expect(page.locator(`#${descrito}`)).toHaveText(/e-mail/i);
  });

  test('rejeita lead sem nome', async ({ page }) => {
    await page.locator('#leads-email').fill('ana@exemplo.com');
    await page.locator('.leads-botao').click();

    await expect(page.locator('#leads-nome')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#leads-nome')).toBeFocused();
  });

  test('a11y: nenhuma violação crítica ou séria', async ({ page }) => {
    const resultados = await auditar(page);
    const bloqueantes = resultados.violations.filter((v) =>
      (IMPACTOS_BLOQUEANTES as readonly string[]).includes(v.impact ?? ''),
    );
    expect(
      bloqueantes.map((v) => `${v.id} (${v.impact}): ${v.nodes.length} nós`),
    ).toEqual([]);
  });

  test('a11y: o hub aberto também não introduz violação', async ({ page }) => {
    await page.locator('.hub-botao').click();
    await expect(page.locator('#hub-acessibilidade')).not.toHaveAttribute('aria-hidden', 'true');

    const resultados = await auditar(page);
    const bloqueantes = resultados.violations.filter((v) =>
      (IMPACTOS_BLOQUEANTES as readonly string[]).includes(v.impact ?? ''),
    );
    expect(bloqueantes.map((v) => v.id)).toEqual([]);
  });

  test('a11y: registra as violações de impacto moderado ou menor', async ({ page }, testeInfo) => {
    const resultados = await auditar(page);
    const monitoradas = resultados.violations.filter((v) =>
      (IMPACTOS_MONITORADOS as readonly string[]).includes(v.impact ?? ''),
    );

    // Não reprova: deixa registrado o que ainda dói para o roadmap.
    await testeInfo.attach('violações moderadas/menores', {
      body: monitoradas.length
        ? monitoradas
            .map((v) => `${v.id} (${v.impact}): ${v.nodes.length} nós`)
            .join('\n')
        : 'nenhuma',
      contentType: 'text/plain',
    });
    expect(monitoradas.length).toBeGreaterThanOrEqual(0);
  });
});
