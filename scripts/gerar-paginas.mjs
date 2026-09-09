#!/usr/bin/env node
/**
 * gerar-paginas.mjs
 *
 * Gera uma página estática por veículo em v/<id>.html (a partir do modelo veiculo.html)
 * com <title>, meta description, Open Graph (foto de capa, preço) e JSON-LD próprios,
 * para que links compartilhados no WhatsApp/Instagram/Google mostrem a prévia certa.
 * Também gera sitemap.xml e ajusta as URLs absolutas que dependem do endereço do site:
 * canonical/og:url/og:image das páginas da raiz, a diretiva Sitemap do robots.txt e o
 * <base href> do 404.html. Sem dependências (Node >= 18).
 *
 * Uso:
 *   node scripts/gerar-paginas.mjs [--site-url https://dominio/] [--data data/vehicles.json] [--root pasta]
 *
 * --root aponta para uma cópia do site (ex.: dist/ no build do Vercel), relativo ao diretório atual;
 * por padrão é a raiz do repositório. Roda depois de scripts/sync-inventory.mjs (npm run sync faz os dois).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizarSiteUrl } from './site-url.mjs';

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 && args[i + 1] ? args[i + 1] : def; };
const ROOT = path.resolve(opt('--root', path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')));
for (const f of ['veiculo.html', 'assets/js/store.js', 'data']) {
  if (!fs.existsSync(path.join(ROOT, f))) throw new Error(`--root não parece uma cópia do site (sem ${f}): ${ROOT}`);
}
const SITE_URL = normalizarSiteUrl(opt('--site-url', 'https://iguatemi-veiculos.vercel.app/'));
const DATA = path.resolve(ROOT, opt('--data', 'data/vehicles.json'));
const OUT_DIR = path.join(ROOT, 'v');
// dados da loja lidos de assets/js/store.js (única fonte)
const STORE = (() => { const w = {}; new Function('window', fs.readFileSync(path.join(ROOT, 'assets/js/store.js'), 'utf8'))(w); return w.STORE; })();
const NOME = STORE.nome;
const WA = STORE.whatsapp;

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const brl = (n) => 'R$ ' + new Intl.NumberFormat('pt-BR', { minimumFractionDigits: Math.round(n * 100) % 100 ? 2 : 0, maximumFractionDigits: Math.round(n * 100) % 100 ? 2 : 0 }).format(n);
const num = (n) => new Intl.NumberFormat('pt-BR').format(n);
const nome = (v) => `${v.marca} ${v.modelo}${v.versao ? ' ' + v.versao : ''} ${v.anoFabricacao}/${v.anoModelo}`;
const curto = (v) => `${v.marca} ${v.modelo} ${v.anoFabricacao}/${v.anoModelo}`;

const doc = JSON.parse(fs.readFileSync(DATA, 'utf8'));
const template = fs.readFileSync(path.join(ROOT, 'veiculo.html'), 'utf8');
const START = '<!-- meta:start', END = '<!-- meta:end -->';
const i0 = template.indexOf(START), i1 = template.indexOf(END);
if (i0 < 0 || i1 < 0) throw new Error('veiculo.html sem os marcadores <!-- meta:start --> / <!-- meta:end -->');
if (!template.includes('<body class="no-bottom-nav has-sticky-cta">')) throw new Error('veiculo.html: tag <body> inesperada');
if (!template.includes('<meta charset="utf-8">')) throw new Error('veiculo.html: sem <meta charset>');

const capaId = (url) => String(url).split('/').pop().replace(/\.[a-z0-9]+$/i, '').replace(/[^A-Za-z0-9_-]/g, '');
// largura/altura do JPEG de prévia (as capas com faixas brancas aparadas ficam mais baixas que 720)
function jpegDims(file) {
  try {
    const b = fs.readFileSync(file); let i = 2;
    while (i < b.length - 9) {
      if (b[i] !== 0xff) { i++; continue; }
      const m = b[i + 1];
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
      i += 2 + b.readUInt16BE(i + 2);
    }
  } catch (e) { /* sem arquivo local: usa o padrão */ }
  return { w: 960, h: 720 };
}
const toIndex = (v) => ({ id: v.id, slug: v.slug, tipo: v.tipo, marca: v.marca, modelo: v.modelo, versao: v.versao, anoFabricacao: v.anoFabricacao, anoModelo: v.anoModelo, km: v.km, preco: v.preco, cambio: v.cambio, combustivel: v.combustivel, capa: v.capa, capaId: capaId(v.capa), caracteristicas: v.caracteristicas, nFotos: v.fotos.length, video: !!v.video });
function semelhantes(v, all) {
  // mesma regra de veiculo.js: mesmo modelo > mesma marca > preço até 20% de diferença
  let list = all.filter((x) => x.id !== v.id && x.modelo === v.modelo && x.marca === v.marca);
  if (list.length < 4) list = list.concat(all.filter((x) => x.id !== v.id && x.marca === v.marca && x.modelo !== v.modelo && x.tipo === v.tipo));
  if (list.length < 4) list = list.concat(all.filter((x) => x.id !== v.id && x.tipo === v.tipo && !list.includes(x) && Math.abs(x.preco - v.preco) / v.preco <= 0.2).sort((a, b) => Math.abs(a.preco - v.preco) - Math.abs(b.preco - v.preco)));
  return list.slice(0, 6).map(toIndex);
}
const jsonInline = (o) => JSON.stringify(o).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

function pagina(v, all) {
  const n = nome(v), preco = brl(v.preco), url = `${SITE_URL}v/${v.id}.html`;
  const og = jpegDims(path.join(ROOT, 'assets/og', `${v.id}-${capaId(v.capa)}.jpg`));
  const desc = `${n} por ${preco}. ${num(v.km)} km, ${v.cambio}, ${v.combustivel}. ${NOME}, Campinas - SP.`;
  const ld = {
    '@context': 'https://schema.org', '@type': v.tipo === 'moto' ? 'Motorcycle' : 'Car', name: n,
    brand: { '@type': 'Brand', name: v.marca }, model: v.modelo, vehicleConfiguration: v.versao || undefined,
    productionDate: String(v.anoFabricacao), vehicleModelDate: String(v.anoModelo),
    mileageFromOdometer: { '@type': 'QuantitativeValue', value: v.km, unitCode: 'KMT' },
    vehicleTransmission: v.cambio, fuelType: v.combustivel, image: v.fotos.slice(0, 5), url, sku: String(v.id),
    itemCondition: 'https://schema.org/UsedCondition',
    offers: { '@type': 'Offer', price: v.preco, priceCurrency: 'BRL', availability: 'https://schema.org/InStock', url, seller: { '@type': 'AutoDealer', name: NOME } },
  };
  const meta = `<!-- gerado por scripts/gerar-paginas.mjs a partir de veiculo.html: não edite à mão -->
<title>${esc(n)} · ${esc(preco)} · ${NOME} · Campinas</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${NOME}">
<meta property="og:title" content="${esc(curto(v))} · ${esc(preco)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${esc(SITE_URL + 'assets/og/' + v.id + '-' + capaId(v.capa) + '.jpg')}">
<meta property="og:image:width" content="${og.w}">
<meta property="og:image:height" content="${og.h}">
<meta property="og:image:alt" content="${esc(n)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:locale" content="pt_BR">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>
<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Estoque', item: SITE_URL + 'estoque.html' }, { '@type': 'ListItem', position: 2, name: v.marca, item: SITE_URL + 'estoque.html?marca=' + encodeURIComponent(v.marca) }, { '@type': 'ListItem', position: 3, name: v.modelo, item: url }] }).replace(/</g, '\\u003c')}</script>`;
  const noscript = `<noscript><div class="container" style="padding:16px 16px 0"><h1>${esc(n)}</h1><p><strong>${esc(preco)}</strong> · ${num(v.km)} km · ${esc(v.cambio)} · ${esc(v.combustivel)}</p><p><img src="${esc(v.capa)}" alt="${esc(n)}" width="800" height="600"></p><p>Este site precisa de JavaScript para mostrar todas as fotos e opcionais. Fale conosco pelo WhatsApp: <a href="https://wa.me/${esc(WA.numero)}">${esc(WA.exibicao)}</a>.</p></div></noscript>`;
  let html = template.slice(0, i0) + meta + template.slice(i1 + END.length);
  html = html.replace('<meta charset="utf-8">', '<meta charset="utf-8">\n<base href="../">');
  html = html.replace('<body class="no-bottom-nav has-sticky-cta">', `<body class="no-bottom-nav has-sticky-cta" data-vehicle-id="${v.id}">`);
  html = html.replace('<main id="main">', '<main id="main">\n  ' + noscript);
  // dados embutidos: a página renderiza sem baixar data/vehicles.json
  html = html.replace('<script src="assets/js/store.js"></script>', '<script>window.__VEICULO__ = ' + jsonInline({ ...v, capaId: capaId(v.capa) }) + ';\nwindow.__SEMELHANTES__ = ' + jsonInline(semelhantes(v, all)) + ';</script>\n<script src="assets/js/store.js"></script>');
  html = html.replace('<link rel="stylesheet" href="assets/css/style.css">', '<link rel="stylesheet" href="assets/css/style.css">\n<link rel="preload" as="image" href="assets/thumbs/' + v.id + '-' + capaId(v.capa) + '.webp" fetchpriority="high">');
  if (!html.includes('window.__VEICULO__')) throw new Error('veiculo.html: não encontrei a tag do store.js para embutir os dados');
  return html;
}

// limpa páginas antigas (veículos vendidos) e gera as atuais
fs.mkdirSync(OUT_DIR, { recursive: true });
const atuais = new Set(doc.veiculos.map((v) => `${v.id}.html`));
let removidas = 0;
for (const f of fs.readdirSync(OUT_DIR)) { if (/^\d+\.html$/.test(f) && !atuais.has(f)) { fs.unlinkSync(path.join(OUT_DIR, f)); removidas++; } }
for (const v of doc.veiculos) fs.writeFileSync(path.join(OUT_DIR, `${v.id}.html`), pagina(v, doc.veiculos));

// sitemap
const estaticas = ['', 'estoque.html', 'venda-seu-veiculo.html', 'financiamento.html', 'quem-somos.html', 'contato.html'];
const lastmod = doc.atualizadoEm || new Date().toISOString().slice(0, 10);
const urls = estaticas.map((p) => `  <url><loc>${esc(SITE_URL + p)}</loc><lastmod>${lastmod}</lastmod><changefreq>daily</changefreq></url>`)
  .concat(doc.veiculos.map((v) => `  <url><loc>${esc(SITE_URL + 'v/' + v.id + '.html')}</loc><lastmod>${lastmod}</lastmod><changefreq>daily</changefreq><image:image><image:loc>${esc(v.capa)}</image:loc><image:title>${esc(nome(v))}</image:title></image:image></url>`));
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls.join('\n')}\n</urlset>\n`);

// URLs absolutas que dependem do endereço do site (páginas da raiz, robots.txt, 404.html)
const ajustar = (arquivo, fn) => {
  const f = path.join(ROOT, arquivo);
  if (!fs.existsSync(f)) return false;
  const antes = fs.readFileSync(f, 'utf8'), depois = fn(antes);
  if (depois !== antes) fs.writeFileSync(f, depois);
  return depois !== antes;
};
let ajustados = 0;
for (const f of fs.readdirSync(ROOT)) {
  if (!/\.html$/.test(f) || f === '404.html') continue;
  const url = SITE_URL + (f === 'index.html' ? '' : f);
  const mudou = ajustar(f, (h) => h
    .replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${esc(url)}">`)
    .replace(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${esc(url)}">`)
    .replace(/<meta property="og:image" content="[^"]*\/assets\/img\/og\.png">/, `<meta property="og:image" content="${esc(SITE_URL + 'assets/img/og.png')}">`));
  if (mudou) ajustados++;
}
// ficha da loja (JSON-LD AutoDealer) estática nas páginas institucionais: legível por qualquer robô, sem depender de JS
const diasSemana = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const lojaLd = {
  '@context': 'https://schema.org', '@type': 'AutoDealer', name: NOME, legalName: STORE.razaoSocial, taxID: STORE.cnpj,
  url: SITE_URL, telephone: STORE.telefone.e164, email: STORE.email, image: SITE_URL + 'assets/img/og.png', logo: SITE_URL + 'assets/img/logo.png',
  address: { '@type': 'PostalAddress', streetAddress: STORE.endereco.logradouro + ', ' + STORE.endereco.numero, addressLocality: STORE.endereco.cidade, addressRegion: STORE.endereco.uf, postalCode: STORE.endereco.cep, addressCountry: 'BR' },
  geo: { '@type': 'GeoCoordinates', latitude: STORE.endereco.lat, longitude: STORE.endereco.lng },
  openingHoursSpecification: STORE.horario.map((h) => ({ '@type': 'OpeningHoursSpecification', dayOfWeek: h.diasSemana.map((d) => diasSemana[d]), opens: h.abre, closes: h.fecha })),
  sameAs: [STORE.links.instagram, STORE.links.facebook, STORE.links.youtube, STORE.links.tiktok].filter(Boolean),
};
const ldTag = '<script type="application/ld+json">' + JSON.stringify(lojaLd).replace(/</g, '\\u003c') + '</script>';
for (const f of ['index.html', 'contato.html', 'quem-somos.html']) {
  if (ajustar(f, (h) => h.replace(/(<!-- ld:start[^>]*-->)[\s\S]*?(<!-- ld:end -->)/, (m, a, b) => a + '\n' + ldTag + '\n' + b))) ajustados++;
}

// links estáticos para as páginas dos veículos: descobertos por qualquer robô e visíveis sem JavaScript
// (o JS troca a lista pelos cartões assim que o índice carrega)
const linha = (v) => `<li><a href="v/${v.id}.html">${esc(nome(v))}</a> <span>${esc(brl(v.preco))}</span></li>`;
const porMarca = [...doc.veiculos].sort((a, b) => a.marca.localeCompare(b.marca) || a.modelo.localeCompare(b.modelo) || a.preco - b.preco);
const listaEstoque = '<ul class="static-list" aria-label="Veículos em estoque">' + porMarca.map(linha).join('') + '</ul>';
const byId = new Map(doc.veiculos.map((v) => [v.id, v]));
const destaques = (doc.destaques || []).map((id) => byId.get(id)).filter(Boolean).slice(0, 8);
const listaHome = '<ul class="static-list" aria-label="Últimas novidades">' + (destaques.length ? destaques : porMarca.slice(0, 8)).map(linha).join('') + '</ul>';
const trocarLista = (arquivo, html) => ajustar(arquivo, (h) => h.replace(/(<!-- lista:start[^>]*-->)[\s\S]*?(<!-- lista:end -->)/, (m, a, b) => a + html + b));
if (trocarLista('estoque.html', listaEstoque)) ajustados++;
// contagem já no HTML (sem JS, o estoque não fica em "Carregando…")
if (ajustar('estoque.html', (h) => h.replace(/(<h1 class="results-title" id="results-count"[^>]*>)[\s\S]*?(<\/h1>)/, (m, a, b) => a + `<b>${doc.veiculos.length}</b> veículos` + b))) ajustados++;
if (trocarLista('index.html', listaHome)) ajustados++;

// robots.txt só vale na raiz do domínio; a diretiva Sitemap precisa da URL completa
if (ajustar('robots.txt', (t) => t.replace(/^Sitemap: .*$/m, `Sitemap: ${SITE_URL}sitemap.xml`))) ajustados++;
// endereço provisório (*.vercel.app): sem indexação, para o Google não guardar um endereço que vai mudar.
// Com o domínio próprio configurado no Vercel, a tag e o Disallow somem sozinhos no build seguinte.
const PROVISORIO = /\.vercel\.app$/i.test(new URL(SITE_URL).hostname);
const META_NOINDEX = '<meta name="robots" content="noindex, nofollow" data-provisorio>';
const robotsMeta = (h) => { const semTag = h.replace(/\n?<meta name="robots"[^>]*data-provisorio>/g, ''); return PROVISORIO ? semTag.replace('<meta charset="utf-8">', '<meta charset="utf-8">\n' + META_NOINDEX) : semTag; };
for (const f of fs.readdirSync(ROOT)) { if (/\.html$/.test(f) && ajustar(f, robotsMeta)) ajustados++; }
for (const f of fs.readdirSync(OUT_DIR)) { if (/^\d+\.html$/.test(f) && ajustar(path.join(path.relative(ROOT, OUT_DIR), f), robotsMeta)) ajustados++; }
if (ajustar('robots.txt', (t) => t.replace(/^(Allow|Disallow): \/$/m, PROVISORIO ? 'Disallow: /' : 'Allow: /'))) ajustados++;
// o 404 é servido de qualquer caminho, então os links relativos precisam do prefixo do site ("/" em domínio próprio ou no Vercel)
if (ajustar('404.html', (h) => h.replace(/<base href="[^"]*">/, `<base href="${esc(new URL(SITE_URL).pathname)}">`))) ajustados++;

console.log(`Geradas ${doc.veiculos.length} páginas em v/ (${removidas} removidas), sitemap.xml com ${urls.length} URLs, ${ajustados} arquivo(s) da raiz com URLs ajustadas. Base: ${SITE_URL}`);
