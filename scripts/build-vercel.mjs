#!/usr/bin/env node
/**
 * build-vercel.mjs
 *
 * Build usado pelo Vercel (ver vercel.json): copia só os arquivos públicos do site para dist/ e,
 * dentro dessa cópia, regenera v/<id>.html, sitemap.xml e as URLs absolutas (canonical, Open Graph,
 * robots.txt, 404.html) com o endereço de produção do projeto. O repositório não é alterado.
 *
 * Endereço do site, em ordem de prioridade:
 *   1. --site-url (uso local)
 *   2. SITE_URL (variável de ambiente do projeto, URL completa, ex.: https://www.seudominio.com.br/)
 *   3. VERCEL_PROJECT_PRODUCTION_URL (o Vercel define sozinho: domínio próprio mais curto ou *.vercel.app)
 *   4. VERCEL_URL (endereço do deploy)
 * Sem nenhum deles o build falha: publicar com URLs de outro endereço (canonical, sitemap, <base> do 404)
 * seria pior do que não publicar.
 *
 * Uso: node scripts/build-vercel.mjs [--out dist] [--site-url https://dominio/]
 * A pasta de saída precisa se chamar dist ou dist-<algo> (é o que .gitignore ignora); ela é apagada e recriada.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { normalizarSiteUrl } from './site-url.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 && args[i + 1] ? args[i + 1] : def; };
const OUT = path.resolve(ROOT, opt('--out', 'dist'));
// a pasta de saída é apagada antes do build: só aceita dist ou dist-<algo>, direto na raiz do repositório
const relOut = path.relative(ROOT, OUT);
if (!/^dist(-[\w.-]+)?$/.test(relOut)) throw new Error(`--out precisa ser "dist" ou "dist-<algo>" na raiz do repositório (recebi: ${relOut || '.'})`);

const env = process.env;
const comProtocolo = (h) => (/^https?:\/\//.test(h) ? h : `https://${h}`);
let siteUrl, origem;
if (opt('--site-url', '')) { siteUrl = opt('--site-url', ''); origem = '--site-url'; }
else if (env.SITE_URL) { siteUrl = env.SITE_URL; origem = 'variável SITE_URL'; }
else if (env.VERCEL_PROJECT_PRODUCTION_URL) { siteUrl = comProtocolo(env.VERCEL_PROJECT_PRODUCTION_URL); origem = 'VERCEL_PROJECT_PRODUCTION_URL (domínio de produção mais curto; com mais de um domínio, defina SITE_URL)'; }
else if (env.VERCEL_URL) { siteUrl = comProtocolo(env.VERCEL_URL); origem = 'VERCEL_URL (endereço deste deploy)'; }
else {
  throw new Error('build-vercel: não sei o endereço do site. No Vercel, ligue "Enable access to System Environment Variables" '
    + '(Settings > Environment Variables) ou crie a variável SITE_URL com a URL final; localmente, passe --site-url https://dominio/.');
}
siteUrl = normalizarSiteUrl(siteUrl);
console.log(`build-vercel: endereço do site ${siteUrl} (origem: ${origem})`);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// o que vai para o ar: páginas, assets, dados, service worker, manifest, robots e sitemap
const PUBLICOS = ['assets', 'data', 'v', 'sw.js', 'manifest.webmanifest', 'robots.txt', 'sitemap.xml'];
const raiz = fs.readdirSync(ROOT);
const html = raiz.filter((f) => /\.html$/.test(f));
const itens = html.concat(PUBLICOS.filter((f) => fs.existsSync(path.join(ROOT, f))));
for (const obrigatorio of ['index.html', '404.html', 'veiculo.html', 'assets', 'data']) {
  if (!itens.includes(obrigatorio)) throw new Error(`build-vercel: falta ${obrigatorio} na raiz do repositório`);
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
for (const item of itens) fs.cpSync(path.join(ROOT, item), path.join(OUT, item), { recursive: true });

// gera as páginas dos veículos e ajusta as URLs absolutas dentro da cópia
const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts/gerar-paginas.mjs'), '--root', OUT, '--site-url', siteUrl], { stdio: 'inherit' });
if (r.status !== 0) { console.error('build-vercel: gerar-paginas.mjs falhou'); process.exit(r.status || 1); }

// conferências mínimas antes de publicar
const ler = (f) => fs.readFileSync(path.join(OUT, f), 'utf8');
const base = new URL(siteUrl).pathname;
if (!ler('404.html').includes(`<base href="${esc(base)}">`)) throw new Error(`build-vercel: 404.html sem <base href="${base}">`);
if (!ler('robots.txt').includes(`Sitemap: ${siteUrl}sitemap.xml`)) throw new Error('build-vercel: robots.txt sem a URL do sitemap');
if (!ler('index.html').includes(`<link rel="canonical" href="${esc(siteUrl)}">`)) throw new Error('build-vercel: index.html sem canonical ajustado');
const paginas = fs.readdirSync(path.join(OUT, 'v')).filter((f) => /^\d+\.html$/.test(f));
if (!paginas.length) throw new Error('build-vercel: nenhuma página em dist/v');
if (!ler(`v/${paginas[0]}`).includes(`<link rel="canonical" href="${esc(siteUrl + 'v/' + paginas[0])}">`)) throw new Error(`build-vercel: v/${paginas[0]} sem canonical ajustado`);
if (/github\.io/.test(ler('index.html') + ler('robots.txt')) && !/github\.io/.test(siteUrl)) throw new Error('build-vercel: sobrou URL do GitHub Pages na saída');

let total = 0;
const contar = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) e.isDirectory() ? contar(path.join(d, e.name)) : total++; };
contar(OUT);
console.log(`build-vercel: ${total} arquivos em ${path.relative(ROOT, OUT)}/ (${paginas.length} páginas de veículos). Site: ${siteUrl}`);
