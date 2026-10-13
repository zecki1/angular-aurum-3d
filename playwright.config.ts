import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright — configuração de testes E2E (pt-BR)
 * Roda na CI e localmente. O app é servido via `ng serve`.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Auditoria axe + WebGL + SwiftShader é CPU-bound: com 8 workers em paralelo
  // o Chromium passa do timeout sem que a falha seja do app. 2 é o equilíbrio.
  workers: process.env.CI ? 1 : 2,
  // O eixo dos testes é uma página com cena 3D: 30s default é aperto demais.
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI
    ? [['html', { open: 'never', outputFolder: 'playwright-report' }], ['list']]
    : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:4200',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'pt-BR',
    // O headless Chromium reporta `prefers-reduced-motion: reduce`. Fixar aqui
    // torna a suíte determinística; o caminho "reduce" tem teste próprio.
    reducedMotion: 'no-preference',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npm start',
        url: 'http://localhost:4200',
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
      },
});