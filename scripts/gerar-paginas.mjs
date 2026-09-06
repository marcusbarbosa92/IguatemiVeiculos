#!/usr/bin/env node
/**
 * gerar-paginas.mjs
 *
 * Gera uma página estática por veículo em v/<id>.html (a partir do modelo veiculo.html)
 * com <title>, meta description, Open Graph (foto de capa, preço) e JSON-LD próprios,
 * para que links compartilhados no WhatsApp/Instagram/Google mostrem a prévia certa.
 * Também gera sitemap.xml. Sem dependências (Node >= 18).
 *
 * Uso:
 *   node scripts/gerar-paginas.mjs [--site-url https://dominio/] [--data data/vehicles.json]
 *
 * Roda depois de scripts/sync-inventory.mjs (npm run sync faz os dois).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 && args[i + 1] ? args[i + 1] : def; };
const SITE_URL = opt('--site-url', 'https://marcusbarbosa92.github.io/IguatemiVeiculos/').replace(/\/?$/, '/');
const DATA = path.resolve(ROOT, opt('--data', 'data/vehicles.json'));
const OUT_DIR = path.join(ROOT, 'v');
const NOME = 'Iguatemi Automóveis';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const brl = (n) => 'R$ ' + new Intl.NumberFormat('pt-BR', { minimumFractionDigits: Math.round(n * 100) % 100 ? 2 : 0, maximumFractionDigits: Math.round(n * 100) % 100 ? 2 : 0 }).format(n);
const num = (n) => new Intl.NumberFormat('pt-BR').format(n);
const nome = (v) => `${v.marca} ${v.modelo}${v.versao ? ' ' + v.versao : ''} ${v.anoFabricacao}/${v.anoModelo}`;

const doc = JSON.parse(fs.readFileSync(DATA, 'utf8'));
const template = fs.readFileSync(path.join(ROOT, 'veiculo.html'), 'utf8');
const START = '<!-- meta:start', END = '<!-- meta:end -->';
const i0 = template.indexOf(START), i1 = template.indexOf(END);
if (i0 < 0 || i1 < 0) throw new Error('veiculo.html sem os marcadores <!-- meta:start --> / <!-- meta:end -->');
if (!template.includes('<body class="no-bottom-nav has-sticky-cta">')) throw new Error('veiculo.html: tag <body> inesperada');
if (!template.includes('<meta charset="utf-8">')) throw new Error('veiculo.html: sem <meta charset>');

function pagina(v) {
  const n = nome(v), preco = brl(v.preco), url = `${SITE_URL}v/${v.id}.html`;
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
<title>${esc(n)} · ${esc(preco)} · ${NOME}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${NOME}">
<meta property="og:title" content="${esc(n)} · ${esc(preco)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${esc(v.capa)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:locale" content="pt_BR">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`;
  const noscript = `<noscript><div class="container" style="padding:16px 16px 0"><h1>${esc(n)}</h1><p><strong>${esc(preco)}</strong> · ${num(v.km)} km · ${esc(v.cambio)} · ${esc(v.combustivel)}</p><p><img src="${esc(v.capa)}" alt="${esc(n)}" width="800" height="600"></p><p>Este site precisa de JavaScript para mostrar todas as fotos e opcionais. Fale conosco pelo WhatsApp: <a href="https://wa.me/5519999950000">(19) 99995-0000</a>.</p></div></noscript>`;
  let html = template.slice(0, i0) + meta + template.slice(i1 + END.length);
  html = html.replace('<meta charset="utf-8">', '<meta charset="utf-8">\n<base href="../">');
  html = html.replace('<body class="no-bottom-nav has-sticky-cta">', `<body class="no-bottom-nav has-sticky-cta" data-vehicle-id="${v.id}">`);
  html = html.replace('<main id="main">', '<main id="main">\n  ' + noscript);
  return html;
}

// limpa páginas antigas (veículos vendidos) e gera as atuais
fs.mkdirSync(OUT_DIR, { recursive: true });
const atuais = new Set(doc.veiculos.map((v) => `${v.id}.html`));
let removidas = 0;
for (const f of fs.readdirSync(OUT_DIR)) { if (/^\d+\.html$/.test(f) && !atuais.has(f)) { fs.unlinkSync(path.join(OUT_DIR, f)); removidas++; } }
for (const v of doc.veiculos) fs.writeFileSync(path.join(OUT_DIR, `${v.id}.html`), pagina(v));

// sitemap
const estaticas = ['', 'estoque.html', 'venda-seu-veiculo.html', 'financiamento.html', 'quem-somos.html', 'contato.html'];
const lastmod = doc.atualizadoEm || new Date().toISOString().slice(0, 10);
const urls = estaticas.map((p) => `  <url><loc>${esc(SITE_URL + p)}</loc><lastmod>${lastmod}</lastmod><changefreq>daily</changefreq></url>`)
  .concat(doc.veiculos.map((v) => `  <url><loc>${esc(SITE_URL + 'v/' + v.id + '.html')}</loc><lastmod>${lastmod}</lastmod><changefreq>daily</changefreq><image:image><image:loc>${esc(v.capa)}</image:loc><image:title>${esc(nome(v))}</image:title></image:image></url>`));
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls.join('\n')}\n</urlset>\n`);

console.log(`Geradas ${doc.veiculos.length} páginas em v/ (${removidas} removidas), sitemap.xml com ${urls.length} URLs. Base: ${SITE_URL}`);
