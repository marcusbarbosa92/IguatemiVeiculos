#!/usr/bin/env node
/* Teste de fumaça no Chromium (Playwright): sobe um servidor estático, abre as páginas no celular e no desktop,
   confere erros de JS, recursos locais quebrados, overflow horizontal e alguns fluxos.
   Local: NODE_PATH=/caminho/para/node_modules node tests/smoke.mjs   (CI instala playwright)
   SMOKE_ROOT=dist node tests/smoke.mjs testa a pasta gerada por npm run build */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// SMOKE_ROOT=dist testa a saída do build do Vercel em vez do repositório
const ROOT = process.env.SMOKE_ROOT ? path.resolve(REPO, process.env.SMOKE_ROOT) : REPO;
if (!fs.existsSync(path.join(ROOT, 'index.html'))) { console.error(`smoke: não achei index.html em ${ROOT}`); process.exit(1); }
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.mp4': 'video/mp4', '.webm': 'video/webm', '.xml': 'application/xml', '.txt': 'text/plain', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}/`;
const idx = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/index.json'), 'utf8'));
const firstId = idx.veiculos[0].id, motoId = (idx.veiculos.find((v) => v.tipo === 'moto') || idx.veiculos[0]).id;
const PAGES = ['index.html', 'estoque.html', `estoque.html?marca=${encodeURIComponent(idx.veiculos[0].marca)}`, `v/${firstId}.html`, `v/${motoId}.html`, `veiculo.html?id=${firstId}`, 'veiculo.html?id=1', 'venda-seu-veiculo.html', 'financiamento.html', 'quem-somos.html', 'contato.html', 'politica-de-privacidade.html'];
const falhas = [];
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox'] } : { args: ['--no-sandbox'] });
for (const vp of [{ w: 390, h: 844, mobile: true }, { w: 1280, h: 800, mobile: false }]) {
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, isMobile: vp.mobile, hasTouch: vp.mobile, locale: 'pt-BR', reducedMotion: 'reduce' });
  await ctx.route((u) => !u.href.startsWith(BASE), (r) => r.abort());
  for (const p of PAGES) {
    const page = await ctx.newPage(); const errs = [];
    page.on('pageerror', (e) => errs.push('erro JS: ' + e.message));
    page.on('response', (r) => { if (r.url().startsWith(BASE) && r.status() >= 400) errs.push(`HTTP ${r.status()} ${r.url().slice(BASE.length)}`); });
    await page.goto(BASE + p, { waitUntil: 'load' }); await page.waitForTimeout(700);
    const info = await page.evaluate(() => ({ h1: !!document.querySelector('h1'), header: !!document.querySelector('.site-header .brand'), footer: !!document.querySelector('.site-footer .f-bottom'), overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth, cards: document.querySelectorAll('.v-card').length, title: document.title }));
    if (!info.h1) errs.push('sem h1'); if (!info.header || !info.footer) errs.push('cabeçalho/rodapé não renderizados'); if (info.overflow) errs.push('overflow horizontal');
    if (/^(index|estoque)/.test(p) && info.cards === 0) errs.push('nenhum cartão de veículo');
    if (p.startsWith('v/') && !/R\$/.test(info.title)) errs.push('título do veículo sem preço');
    for (const e of errs) falhas.push(`${vp.w}px ${p}: ${e}`);
    await page.close();
  }
  await ctx.close();
}
// fluxos no celular
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
await ctx.route((u) => !u.href.startsWith(BASE), (r) => r.abort());
await ctx.addInitScript(() => { window.open = (u) => { window.__last = u; return null; }; });
const page = await ctx.newPage(); page.on('pageerror', (e) => falhas.push('fluxo: erro JS ' + e.message));
try {
  await page.goto(BASE + 'estoque.html', { waitUntil: 'load' }); await page.waitForTimeout(700);
  const total = await page.$eval('#results-count b', (b) => +b.textContent);
  await page.click('#btn-filters'); await page.waitForTimeout(300); await page.click('#f-cambio .chip >> nth=0'); await page.click('#f-apply'); await page.waitForTimeout(400);
  const filtrado = await page.$eval('#results-count b', (b) => +b.textContent);
  if (!(filtrado > 0 && filtrado < total)) falhas.push(`fluxo: filtro não reduziu (${total} -> ${filtrado})`);
  if (!/cambio=/.test(page.url())) falhas.push('fluxo: filtro não foi para a URL');
  await page.evaluate(() => document.querySelector('.v-card [data-fav]').click()); await page.waitForTimeout(200);
  if ((await page.evaluate(() => JSON.parse(localStorage.getItem('favoritos') || '[]').length)) !== 1) falhas.push('fluxo: favorito não salvo');
  await page.click('.v-card .card-link >> nth=0'); await page.waitForLoadState('load'); await page.waitForTimeout(700);
  if (!/\/v\/\d+\.html$/.test(page.url())) falhas.push('fluxo: cartão não abriu v/<id>.html: ' + page.url());
  await page.evaluate(() => document.querySelector('#g-full').click()); await page.waitForTimeout(300);
  if (!(await page.$eval('#lightbox', (e) => e.classList.contains('open')))) falhas.push('fluxo: tela cheia não abriu');
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  await page.evaluate(() => document.querySelector('#btn-sim').click()); await page.waitForTimeout(300);
  await page.fill('#sim-nome', 'Teste'); await page.fill('#sim-tel', '19999990000'); await page.evaluate(() => document.querySelector('#sim-form button[type=submit]').click()); await page.waitForTimeout(300);
  const wa = await page.evaluate(() => decodeURIComponent(window.__last || ''));
  if (!/wa\.me\/5519999950000\?text=\*Proposta de financiamento/.test(wa) || !/Telefone: \(19\) 99999-0000/.test(wa)) falhas.push('fluxo: mensagem de simulação errada: ' + wa.slice(0, 80));
} catch (e) { falhas.push('fluxo: ' + e.message.split('\n')[0]); }
await browser.close(); server.close();
if (falhas.length) { console.error(`FALHOU (${falhas.length}):\n  ` + falhas.join('\n  ')); process.exit(1); }
console.log(`OK: ${PAGES.length} páginas em 2 viewports e fluxos principais sem erros.`);
