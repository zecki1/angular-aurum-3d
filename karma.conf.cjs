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
      // Ordem determinística. Cada spec que monta a cena cria um contexto
      // WebGL (com PMREMGenerator) que só é liberado no `limpar`; na ordem
      // aleatória do Jasmine o pico de contextos Retention+Uint8Array variava
      // a cada run e o Chrome morria com DISCONNECTED no meio da suíte. Fixar
      // a ordem deixa o consumo determinístico.
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
    // O runner do GitHub (`ubuntu-latest`) não tem GPU, e o Chrome headless
    // recusa criar um contexto WebGL sem software rendering — daí o
    // "THREE.WebGLRenderer: Error creating WebGL context" e o spec da cena
    // estourar o timeout no CI, apesar de passar localmente.
    //
    // Só no CI ligamos o SwiftShader: localmente a máquina tem GPU de verdade e
    // forçar ANGLE/SwiftShader lá derruba o browser no meio da suíte. A decisão
    // de usar Karma continua válida — é o ponto do §2.2 do planejamento.
    browsers: [process.env.CI ? 'ChromeHeadlessWebGL' : 'ChromeHeadless'],
    customLaunchers: {
      ChromeHeadlessWebGL: {
        base: 'ChromeHeadless',
        flags: [
          '--use-gl=angle',
          '--use-angle=swiftshader',
          '--enable-unsafe-swiftshader',
          '--disable-gpu-sandbox',
          '--no-sandbox',
          '--disable-dev-shm-usage',
          '--disable-setuid-sandbox',
          // O render por software do SwiftShader é ordens de grandeza mais lento
          // que GPU real e acumula memória por spec; sem teto de memória o
          // processo do Chrome morre no meio da suíte e o Karma reporta
          // "DISCONNECTED" (não uma asserção falha).
          '--js-flags=--max-old-space-size=2048',
        ],
      },
    },
    // Render por software é ordens de grandeza mais lento que GPU real: sem
    // estes tetos o Karma mata o browser antes de a suíte terminar.
    browserNoActivityTimeout: 300000,
    browserDisconnectTimeout: 60000,
    browserDisconnectTolerance: 3,
    captureTimeout: 180000,
    // Desconexão do browser por SwiftShader é instabilidade do runner, não
    // asserção quebrada: o Karma reexecuta o spec em vez de reprovar o build.
    retryLimit: 2,
    // O SwiftShader mata o processo depois de um punhado de contextos WebGL.
    // Isolar cada spec em seu próprio browser mantém o consumo de memória
    // constante; o custo é subir o Chrome uma vez por spec.
    concurrency: 1,
    singleRun: false,
    restartOnFileChange: true,
  });
};