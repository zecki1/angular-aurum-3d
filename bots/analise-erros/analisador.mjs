/**
 * Bot: análise de erros (pt-BR)
 * Lê artifacts de logs salvos pelo CI e abre/atualiza uma issue com o resumo.
 * Roda como workflow_run quando um pipeline falha.
 *
 * Uso: node bots/analise-erros/analisador.mjs <arquivo-log>
 */
import { readFileSync, existsSync } from 'node:fs';

const caminhoLog = process.argv[2];
if (!caminhoLog || !existsSync(caminhoLog)) {
  console.log('ℹ️ Sem log para analisar — execução normal.');
  process.exit(0);
}

const conteudo = readFileSync(caminhoLog, 'utf8').slice(0, 40000);

const padroes = [
  { nome: 'Erro de TypeScript', regex: /error TS\d+:.*/g },
  { nome: 'Erro de build (ng)', regex: /(?:ERROR|Failed to compile).*|#error.*/gi },
  { nome: 'Erro de lint', regex: /(?:ERROR|warning).*\.(ts|html|scss)/gi },
  { nome: 'Falha de teste unitário', regex: /(?:FAILED|✗).*/g },
  { nome: 'Falha de E2E (Playwright)', regex: /(?:timed out waiting|expect\(|FAIL)/gi },
  { nome: 'Erro de dependência', regex: /(?:npm ERR!|Can't resolve|Module not found).*/g },
];

const achados = [];
for (const padrao of padroes) {
  const matches = conteudo.match(padrao.regex);
  if (matches?.length) achados.push({ nome: padrao.nome, exemplos: [...new Set(matches)].slice(0, 5) });
}

const agora = new Date().toISOString();
const corpo = [
  '## 🤖 Relatório automático do Bot de Análise de Erros',
  '',
  `Gerado em: ` + '`' + agora + '`',
  '',
  achados.length
    ? achados.map(a => `### ${a.nome}\n\`\`\`\n${a.exemplos.join('\n')}\n\`\`\``).join('\n')
    : 'Nenhum padrão conhecido identificado nos logs. Verifique o artifact `logs-do-ci`.',
  '',
  '> Próximos passos: investigar a causa → corrigir → PR para `develop` → merge e nova análise.',
].join('\n');

process.stdout.write(corpo);
console.error('\nBot de análise de erros concluído.');