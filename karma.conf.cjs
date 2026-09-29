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
      // O servidor do Karma injeta estas chaves em `window.__karma__.config`,
      // que é o único caminho que chega ao browser. Ler `process.env` aqui
      // não funcionaria: os specs rodam no browser, não no Node.
      //
      // `semWebgl` faz o `scene.service.spec.ts` exercitar o contrato da cena
      // noop em vez de criar um `WebGLRenderer` por spec. Sem GPU no runner, o
      // Chrome 153 para de responder no meio da criação do contexto, o Karma
      // reporta "ping timeout" e o job estoura em `browserNoActivityTimeout` —
      // no spec 77 de 121, sem nenhum FAILED. O relatório de cobertura cai de
      // 95,11% para 87,63% statements, ainda acima do gate de 80%; o caminho
      // three.js fica para a máquina de desenvolvimento, que tem GPU.
      semWebgl: !!process.env.CI,
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
    // Houve um launcher `ChromeHeadlessWebGL` com
    // `--use-gl=angle --use-angle=swiftshader` aqui, e ele foi suspeito por um
    // tempo sem ser a causa: o travamento continuava no mesmo spec 77 com ele
    // removido. Fica registrado porque as flags fazem o SwiftShader entrar em
    // jogo mesmo sem a suíte pedir contexto, o que só confunde a investigação.
    //
    // O Chrome simples faz WebGL de verdade na máquina de desenvolvimento, e
    // é o que o `scene.service.spec.ts` usa por lá — via `semWebgl: false`.
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