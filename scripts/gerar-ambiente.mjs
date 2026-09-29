#!/usr/bin/env node
// Gera `src/environments/ambiente.local.ts` a partir de `.env` e do ambiente do
// processo. O arquivo gerado é gitignored: é o único lugar onde chaves de
// terceiros (Supabase, TMDB, Clarity) existem no projeto.
//
// Por que codegen e não `import.meta.env`? O builder `@angular/build:application`
// (esbuild) não implementa o contrato `import.meta.env` do Vite — a substituição
// acontece só via `define`, que exige literais em `angular.json` (ou seja, a
// chave voltaria para dentro do repo). Gera-se o módulo TypeScript antes do
// build para manter o contrato `VITE_*` do §4.5 do planejamento.
//
// Executado por `postinstall`, `prestart`, `prebuild` e `pretest`.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const arquivoEnv = join(raiz, '.env');
const arquivoSaida = join(raiz, 'src', 'environments', 'ambiente.local.ts');

/** Prefixos lidos do ambiente. Tudo fora disso é descartado. */
const PREFIXOS = ['VITE_', 'CLARITY_'];

function lerDotEnv(caminho) {
  if (!existsSync(caminho)) return {};

  const saida = {};
  for (const linha of readFileSync(caminho, 'utf8').split(/\r?\n/)) {
    const semComentario = linha.trim();
    if (!semComentario || semComentario.startsWith('#')) continue;

    const separador = semComentario.indexOf('=');
    if (separador < 1) continue;

    const chave = semComentario.slice(0, separador).trim();
    let valor = semComentario.slice(separador + 1).trim();

    // remove aspas envolventes, se houver
    if (
      (valor.startsWith('"') && valor.endsWith('"')) ||
      (valor.startsWith("'") && valor.endsWith("'"))
    ) {
      valor = valor.slice(1, -1);
    }

    saida[chave] = valor;
  }
  return saida;
}

function coletar() {
  const valores = { ...lerDotEnv(arquivoEnv) };

  // Variáveis já exportadas no shell / CI / Vercel têm prioridade sobre o `.env`.
  for (const [chave, valor] of Object.entries(process.env)) {
    if (PREFIXOS.some((prefixo) => chave.startsWith(prefixo)) && valor) {
      valores[chave] = valor;
    }
  }

  return valores;
}

const valores = coletar();
const entradas = Object.keys(valores)
  .sort()
  .map((chave) => `  ${chave}: ${JSON.stringify(valores[chave])},`);

const conteudo = `// Arquivo GERADO por scripts/gerar-ambiente.mjs — não commitar.
// Origem: .env local e/ou variáveis de ambiente (Vercel, CI).
export const ambienteLocal: Record<string, string> = {
${entradas.join('\n')}
};
`;

// O diretório de saída é gitignored junto com o arquivo, então num clone novo
// (ou no runner do CI) ele simplesmente não existe. Sem criar aqui, o
// `postinstall` quebrava o `npm ci` com ENOENT e derrubava o pipeline inteiro.
mkdirSync(dirname(arquivoSaida), { recursive: true });

writeFileSync(arquivoSaida, conteudo, 'utf8');

console.log(
  `[ambiente] ${arquivoSaida} — ${entradas.length} variavel(is): ` +
    (entradas.length ? entradas.map((l) => l.trim().split(':')[0]).join(', ') : 'nenhuma (modo demo)'),
);
