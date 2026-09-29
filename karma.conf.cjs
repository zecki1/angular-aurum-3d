// Configuração do Karma — Semana 5 (Aurum)
// Decisão (README): Karma + ChromeHeadless para validar cena three.js/WebGL e
// interações visuais em browser real. O builder @angular/build:karma cuida dos
// plugins/árvore de testes automaticamente.
module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-coverage'),
    ],
    client: {
      // Ordem determinística: os specs que montam a cena contam frames por
      // rAF, então a ordem de execução muda o resultado da medição.
      jasmine: { random: false },
      clearContext: false,
    },
    coverageReporter: {
      dir: require('path').join(__dirname, './coverage/aurum-3d'),
      subdir: '.',
      reporters: [
        { type: 'html' },
        { type: 'lcovonly' },
        { type: 'text-summary' },
      ],
      check: {
        global: {
          statements: 80,
          branches: 70,
          functions: 80,
          lines: 80,
        },
      },
    },
    reporters: ['progress', 'coverage'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    // Browser único, sem flags de GPU.
    //
    // O CI chegou aqui por exclusão depois de duas hipóteses erradas. A
    // primeira era acúmulo de contextos WebGL: mas desligar o WebGL nos specs
    // (AURUM_SEM_WEBGL=1) NÃO resolveu, porque o crash continuava no mesmo
    // spec 77. A segunda era isnaldia do runner: `concurrency: 1` só empurrou a
    // queda do spec 34 para o 77 e levou a execução a 17m44s.
    //
    // O culpado era o launcher `ChromeHeadlessWebGL`. Reproduzido localmente:
    // com as mesmas flags de SwiftShader, a suíte cai em DISCONNECTED mesmo
    // sem criar nenhum contexto WebGL, porque `--use-gl=angle
    // --use-angle=swiftshader` derruba o processo do Chrome no CI. Com o
    // ChromeHeadless puro, 121/121 em 12s.
    //
    // Nada se perde em usar o Chrome simples: na máquina de desenvolvimento ele
    // faz WebGL de verdade, e o `scene.service.spec.ts` usa esse caminho.
    browsers: ['ChromeHeadless'],
    // Render por software é ordens de grandeza mais lento que GPU real: sem
    // estes tetos o Karma mata o browser antes de a suíte terminar.
    browserNoActivityTimeout: 300000,
    browserDisconnectTimeout: 60000,
    browserDisconnectTolerance: 3,
    captureTimeout: 180000,
    singleRun: false,
    restartOnFileChange: true,
  });
};