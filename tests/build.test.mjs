#!/usr/bin/env node
/* Confere o build do Vercel (scripts/build-vercel.mjs): a pasta de saída tem só o que é público,
   as URLs absolutas seguem o endereço do projeto e o repositório não é alterado. */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const falhas = [];
const check = (ok, msg) => { if (!ok) falhas.push(msg); };

const antes = spawnSync('git', ['status', '--porcelain'], { cwd: ROOT, encoding: 'utf8' }).stdout;
const OUT = path.join(ROOT, `dist-teste-${process.pid}`);
const HOST = 'exemplo-iguatemi.vercel.app';
const r = spawnSync(process.execPath, ['scripts/build-vercel.mjs', '--out', path.basename(OUT)], {
  cwd: ROOT, encoding: 'utf8', env: { ...process.env, SITE_URL: '', VERCEL_PROJECT_PRODUCTION_URL: HOST, VERCEL_URL: 'outro.vercel.app' },
});
// SITE_URL vazio (acima) não pode contar como definido: o endereço tem de vir de VERCEL_PROJECT_PRODUCTION_URL
check(r.status === 0, `build-vercel saiu com ${r.status}: ${r.stderr}`);

try {
  const ler = (f) => fs.readFileSync(path.join(OUT, f), 'utf8');
  const existe = (f) => fs.existsSync(path.join(OUT, f));
  const SITE = `https://${HOST}/`;

  // só o público vai para o ar
  for (const f of ['index.html', 'estoque.html', 'veiculo.html', '404.html', 'sw.js', 'manifest.webmanifest', 'robots.txt', 'sitemap.xml', 'assets/css/style.css', 'assets/js/app.js', 'data/index.json', 'data/vehicles.json']) check(existe(f), `falta ${f} na saída`);
  for (const f of ['scripts', 'tests', '.github', 'README.md', 'package.json', 'vercel.json', 'node_modules', '.git', '.gitignore']) check(!existe(f), `${f} não deveria ir para o ar`);

  // URLs absolutas com o endereço do projeto
  check(ler('index.html').includes(`<link rel="canonical" href="${SITE}">`), 'index.html: canonical não aponta para o endereço do projeto');
  check(ler('index.html').includes(`<meta property="og:url" content="${SITE}">`), 'index.html: og:url não aponta para o endereço do projeto');
  check(ler('index.html').includes(`<meta property="og:image" content="${SITE}assets/img/og.png">`), 'index.html: og:image não aponta para o endereço do projeto');
  check(ler('estoque.html').includes(`<link rel="canonical" href="${SITE}estoque.html">`), 'estoque.html: canonical errado');
  check(ler('veiculo.html').includes(`<meta property="og:image" content="${SITE}assets/img/og.png">`), 'veiculo.html: og:image errado');
  check(ler('404.html').includes('<base href="/">'), '404.html: <base> precisa ser "/" na raiz do domínio');
  check(ler('robots.txt').includes(`Sitemap: ${SITE}sitemap.xml`), 'robots.txt: Sitemap errado');
  check(!ler('sitemap.xml').includes('github.io'), 'sitemap.xml ainda cita o GitHub Pages');
  check(ler('sitemap.xml').includes(`<loc>${SITE}estoque.html</loc>`), 'sitemap.xml sem a URL do estoque no endereço do projeto');

  const idx = JSON.parse(ler('data/index.json'));
  const paginas = fs.readdirSync(path.join(OUT, 'v')).filter((f) => /^\d+\.html$/.test(f));
  check(paginas.length === idx.veiculos.length, `dist/v tem ${paginas.length} páginas, esperava ${idx.veiculos.length}`);
  for (const v of idx.veiculos.slice(0, 3)) {
    const h = ler(`v/${v.id}.html`);
    check(h.includes(`<link rel="canonical" href="${SITE}v/${v.id}.html">`), `v/${v.id}.html: canonical errado`);
    check(h.includes(`content="${SITE}assets/og/${v.id}-${v.capaId}.jpg"`), `v/${v.id}.html: og:image errado`);
    check(h.includes('<base href="../">'), `v/${v.id}.html: sem <base href="../">`);
  }
  const todos = fs.readdirSync(OUT).filter((f) => /\.html$/.test(f)).map((f) => ler(f)).join('\n');
  check(!/https:\/\/marcusbarbosa92\.github\.io/.test(todos), 'alguma página da raiz ainda cita o GitHub Pages');

  // o repositório continua igual (o build não pode mexer em v/, sitemap.xml, robots.txt, 404.html nem nas páginas)
  const depois = spawnSync('git', ['status', '--porcelain'], { cwd: ROOT, encoding: 'utf8' }).stdout;
  check(depois === antes, `o build alterou arquivos do repositório:\n${depois}`);
} finally {
  fs.rmSync(OUT, { recursive: true, force: true });
}

// endereço fixo via SITE_URL, inclusive em subpasta (mesmo caso do GitHub Pages)
{
  const OUT2 = path.join(ROOT, `dist-teste-${process.pid}-b`);
  const r2 = spawnSync(process.execPath, ['scripts/build-vercel.mjs', '--out', path.basename(OUT2)], {
    cwd: ROOT, encoding: 'utf8', env: { ...process.env, SITE_URL: 'https://www.exemplo.com.br/loja', VERCEL_PROJECT_PRODUCTION_URL: HOST },
  });
  check(r2.status === 0, `build-vercel com SITE_URL saiu com ${r2.status}: ${r2.stderr}`);
  try {
    const ler = (f) => fs.readFileSync(path.join(OUT2, f), 'utf8');
    check(ler('404.html').includes('<base href="/loja/">'), '404.html: <base> deveria ser "/loja/" com SITE_URL em subpasta');
    check(ler('index.html').includes('<link rel="canonical" href="https://www.exemplo.com.br/loja/">'), 'SITE_URL não teve prioridade sobre VERCEL_PROJECT_PRODUCTION_URL');
    check(ler('robots.txt').includes('Sitemap: https://www.exemplo.com.br/loja/sitemap.xml'), 'robots.txt: Sitemap não seguiu SITE_URL');
  } finally {
    fs.rmSync(OUT2, { recursive: true, force: true });
  }
}

// vercel.json precisa ser JSON válido e apontar para o build
const vj = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
check(vj.buildCommand === 'node scripts/build-vercel.mjs', 'vercel.json: buildCommand inesperado');
check(vj.outputDirectory === 'dist', 'vercel.json: outputDirectory deveria ser dist');
check(vj.framework === null, 'vercel.json: framework deveria ser null (preset "Other")');
check(!('public' in vj) && !('builds' in vj), 'vercel.json: propriedades legadas (public/builds) quebram o deploy');
check(fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8').includes('dist/'), '.gitignore sem dist/');

if (falhas.length) { console.error(`build.test: ${falhas.length} falha(s)\n- ` + falhas.join('\n- ')); process.exit(1); }
console.log('build.test: build do Vercel ok');
