#!/usr/bin/env node
/**
 * build-vercel.mjs
 *
 * Build usado pelo Vercel (ver vercel.json): copia só os arquivos públicos do site para dist/ e,
 * dentro dessa cópia, regenera v/<id>.html, sitemap.xml e as URLs absolutas (canonical, Open Graph,
 * robots.txt, 404.html) com o endereço de produção do projeto. O repositório não é alterado.
 *
 * Endereço do site, em ordem de prioridade:
 *   1. SITE_URL (variável de ambiente, URL completa, ex.: https://www.seudominio.com.br/)
 *   2. VERCEL_PROJECT_PRODUCTION_URL (o Vercel define sozinho: domínio próprio mais curto ou *.vercel.app)
 *   3. VERCEL_URL (endereço do deploy)
 *   4. endereço do GitHub Pages (com aviso)
 *
 * Uso: node scripts/build-vercel.mjs [--out dist]
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 && args[i + 1] ? args[i + 1] : def; };
const OUT = path.resolve(ROOT, opt('--out', 'dist'));
if (OUT === ROOT || !OUT.startsWith(ROOT + path.sep)) throw new Error(`--out precisa ser uma pasta dentro do repositório: ${OUT}`);

const env = process.env;
const comProtocolo = (h) => (/^https?:\/\//.test(h) ? h : `https://${h}`);
let siteUrl;
if (env.SITE_URL) siteUrl = env.SITE_URL;
else if (env.VERCEL_PROJECT_PRODUCTION_URL) siteUrl = comProtocolo(env.VERCEL_PROJECT_PRODUCTION_URL);
else if (env.VERCEL_URL) siteUrl = comProtocolo(env.VERCEL_URL);
else { siteUrl = 'https://marcusbarbosa92.github.io/IguatemiVeiculos/'; console.warn('build-vercel: sem SITE_URL nem VERCEL_PROJECT_PRODUCTION_URL; usando o endereço do GitHub Pages nas URLs absolutas.'); }
siteUrl = siteUrl.replace(/\/?$/, '/');

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
if (!ler('404.html').includes(`<base href="${base}">`)) throw new Error(`build-vercel: 404.html sem <base href="${base}">`);
if (!ler('robots.txt').includes(`Sitemap: ${siteUrl}sitemap.xml`)) throw new Error('build-vercel: robots.txt sem a URL do sitemap');
if (!ler('index.html').includes(`<link rel="canonical" href="${siteUrl}">`)) throw new Error('build-vercel: index.html sem canonical ajustado');
const paginas = fs.readdirSync(path.join(OUT, 'v')).filter((f) => /^\d+\.html$/.test(f));
if (!paginas.length) throw new Error('build-vercel: nenhuma página em dist/v');
if (!ler(`v/${paginas[0]}`).includes(`<link rel="canonical" href="${siteUrl}v/${paginas[0]}">`)) throw new Error(`build-vercel: v/${paginas[0]} sem canonical ajustado`);

let total = 0;
const contar = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) e.isDirectory() ? contar(path.join(d, e.name)) : total++; };
contar(OUT);
console.log(`build-vercel: ${total} arquivos em ${path.relative(ROOT, OUT)}/ (${paginas.length} páginas de veículos). Site: ${siteUrl}`);
