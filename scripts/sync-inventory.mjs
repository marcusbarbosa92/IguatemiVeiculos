#!/usr/bin/env node
/**
 * sync-inventory.mjs
 *
 * Re-scrapes the dealership website (AutoCerto platform) and regenerates
 *   data/vehicles.json  – full vehicle records
 *   data/index.json     – lightweight listing index
 *   (both carry "destaques": ids of the home page's "Últimas novidades", in the store's order)
 *
 * Zero dependencies: Node >= 22 built-ins only (fetch, fs, path, url).
 *
 * Usage:
 *   node scripts/sync-inventory.mjs                       live mode (fetch the website)
 *   node scripts/sync-inventory.mjs --from-dir <dir>      offline mode: reads
 *                                                         <dir>/Veiculos.html, <dir>/motos.html,
 *                                                         <dir>/detail/<id>.html
 *   --date YYYY-MM-DD   override "atualizadoEm" (default: today, UTC)
 *   --check-only        só confere se a listagem mudou em relação a data/index.json (ids, capas, preços e
 *                       destaques); não baixa páginas de detalhe nem grava nada. Imprime "mudou=true|false"
 *                       e, no GitHub Actions, grava a mesma linha em $GITHUB_OUTPUT.
 *   --out <dir>         output directory (default: <repo>/data)
 *   --help              show this help
 *
 * The script fails loudly (non-zero exit, nothing written) when any detail page
 * cannot be parsed (title / price / photos) or when the number of parsed
 * vehicles differs from the number of cards on the listing page.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const BASE_URL = 'https://iguatemiautomoveis.com.br';
const LISTING_URL = `${BASE_URL}/Veiculos`;
const MOTO_LISTING_URL = `${BASE_URL}/Veiculos?tipoveiculo=2`;
const HOME_URL = `${BASE_URL}/`; // "Últimas novidades" da home (ordem definida pela loja)
const USER_AGENT =
  'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36';

const CONCURRENCY = 4; // parallel workers for detail pages
const DELAY_MS = 300; // pause between requests, per worker
const MAX_RETRIES = 3; // retries per fetch (on top of the first attempt)
const FETCH_TIMEOUT_MS = 30_000;

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const opts = { fromDir: null, date: null, out: null, help: false, force: false, checkOnly: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      const v = argv[++i];
      if (v === undefined) throw new Error(`Missing value for ${a}`);
      return v;
    };
    if (a === '--from-dir') opts.fromDir = next();
    else if (a === '--date') opts.date = next();
    else if (a === '--out') opts.out = next();
    else if (a === '--force') opts.force = true;
    else if (a === '--check-only') opts.checkOnly = true;
    else if (a === '--help' || a === '-h') opts.help = true;
    else throw new Error(`Unknown argument: ${a}`);
  }
  return opts;
}

function usage() {
  return `Usage: node scripts/sync-inventory.mjs [--from-dir <dir>] [--date YYYY-MM-DD] [--out <dir>] [--force]

  (no flags)          live mode: fetch ${LISTING_URL} and every detail page
  --from-dir <dir>    offline mode: read <dir>/Veiculos.html, <dir>/motos.html, <dir>/detail/<id>.html
  --date YYYY-MM-DD   override "atualizadoEm" (default: today in UTC)
  --out <dir>         output directory (default: ${path.join(REPO_ROOT, 'data')})
  --force             accept a listing with less than half of the previous vehicle count
`;
}

// ---------------------------------------------------------------------------
// HTML helpers (mirror Python's html.unescape / re-based cleaning)
// ---------------------------------------------------------------------------

// Named entities that may appear on the site (basic + Latin-1 + a few typographic ones).
const NAMED_ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0',
  iexcl: '¡', cent: '¢', pound: '£', curren: '¤', yen: '¥', brvbar: '¦', sect: '§', uml: '¨',
  copy: '©', ordf: 'ª', laquo: '«', not: '¬', shy: '\u00ad', reg: '®', macr: '¯', deg: '°',
  plusmn: '±', sup2: '²', sup3: '³', acute: '´', micro: 'µ', para: '¶', middot: '·', cedil: '¸',
  sup1: '¹', ordm: 'º', raquo: '»', frac14: '¼', frac12: '½', frac34: '¾', iquest: '¿',
  Agrave: 'À', Aacute: 'Á', Acirc: 'Â', Atilde: 'Ã', Auml: 'Ä', Aring: 'Å', AElig: 'Æ', Ccedil: 'Ç',
  Egrave: 'È', Eacute: 'É', Ecirc: 'Ê', Euml: 'Ë', Igrave: 'Ì', Iacute: 'Í', Icirc: 'Î', Iuml: 'Ï',
  ETH: 'Ð', Ntilde: 'Ñ', Ograve: 'Ò', Oacute: 'Ó', Ocirc: 'Ô', Otilde: 'Õ', Ouml: 'Ö', times: '×',
  Oslash: 'Ø', Ugrave: 'Ù', Uacute: 'Ú', Ucirc: 'Û', Uuml: 'Ü', Yacute: 'Ý', THORN: 'Þ', szlig: 'ß',
  agrave: 'à', aacute: 'á', acirc: 'â', atilde: 'ã', auml: 'ä', aring: 'å', aelig: 'æ', ccedil: 'ç',
  egrave: 'è', eacute: 'é', ecirc: 'ê', euml: 'ë', igrave: 'ì', iacute: 'í', icirc: 'î', iuml: 'ï',
  eth: 'ð', ntilde: 'ñ', ograve: 'ò', oacute: 'ó', ocirc: 'ô', otilde: 'õ', ouml: 'ö', divide: '÷',
  oslash: 'ø', ugrave: 'ù', uacute: 'ú', ucirc: 'û', uuml: 'ü', yacute: 'ý', thorn: 'þ', yuml: 'ÿ',
  ndash: '–', mdash: '—', lsquo: '‘', rsquo: '’', sbquo: '‚', ldquo: '“', rdquo: '”', bdquo: '„',
  bull: '•', hellip: '…', trade: '™', euro: '€', oline: '‾', lsaquo: '‹', rsaquo: '›',
};
// Legacy entities that HTML (and Python's html.unescape) also accept without the trailing ';'.
const LEGACY_ENTITIES = new Set(
  Object.keys(NAMED_ENTITIES).filter((k) => !['apos', 'ndash', 'mdash', 'lsquo', 'rsquo', 'sbquo', 'ldquo', 'rdquo', 'bdquo', 'bull', 'hellip', 'trade', 'euro', 'oline', 'lsaquo', 'rsaquo'].includes(k)),
);
// Windows-1252 remapping of C1 control code points (HTML5 / Python html.unescape behaviour).
const INVALID_CHARREFS = {
  0x00: '�', 0x0d: '\r', 0x80: '€', 0x81: '\x81', 0x82: '‚', 0x83: 'ƒ',
  0x84: '„', 0x85: '…', 0x86: '†', 0x87: '‡', 0x88: 'ˆ', 0x89: '‰',
  0x8a: 'Š', 0x8b: '‹', 0x8c: 'Œ', 0x8d: '\x8d', 0x8e: 'Ž', 0x8f: '\x8f',
  0x90: '\x90', 0x91: '‘', 0x92: '’', 0x93: '“', 0x94: '”', 0x95: '•',
  0x96: '–', 0x97: '—', 0x98: '˜', 0x99: '™', 0x9a: 'š', 0x9b: '›',
  0x9c: 'œ', 0x9d: '\x9d', 0x9e: 'ž', 0x9f: 'Ÿ',
};

function isInvalidCodepoint(cp) {
  return (
    (cp >= 0x1 && cp <= 0x8) || cp === 0xb || (cp >= 0xe && cp <= 0x1f) || (cp >= 0x7f && cp <= 0x9f) ||
    (cp >= 0xfdd0 && cp <= 0xfdef) || (cp & 0xfffe) === 0xfffe
  );
}

function replaceCharref(match, body) {
  if (body[0] === '#') {
    const hex = body[1] === 'x' || body[1] === 'X';
    let num = parseInt(body.slice(hex ? 2 : 1).replace(/;$/, ''), hex ? 16 : 10);
    if (Number.isNaN(num)) return match;
    if (Object.hasOwn(INVALID_CHARREFS, num)) return INVALID_CHARREFS[num];
    if ((num >= 0xd800 && num <= 0xdfff) || num > 0x10ffff) return '�';
    if (isInvalidCodepoint(num)) return '';
    return String.fromCodePoint(num);
  }
  if (body.endsWith(';')) {
    const name = body.slice(0, -1);
    if (Object.hasOwn(NAMED_ENTITIES, name)) return NAMED_ENTITIES[name];
  }
  // legacy entity without ';' – longest matching prefix wins, remainder is kept
  for (let x = body.length - 1; x > 1; x--) {
    const prefix = body.slice(0, x);
    if (LEGACY_ENTITIES.has(prefix)) return NAMED_ENTITIES[prefix] + body.slice(x);
  }
  return match;
}

/** Equivalent of Python's html.unescape(). */
function htmlUnescape(s) {
  if (!s.includes('&')) return s;
  return s.replace(/&(#[0-9]+;?|#[xX][0-9a-fA-F]+;?|[^\t\n\f <&#;]{1,32};?)/g, replaceCharref);
}

function stripTags(s) {
  return s.replace(/<[^>]+>/g, '');
}

/** strip tags -> html-unescape -> collapse whitespace -> trim */
function clean(s) {
  return htmlUnescape(stripTags(s)).replace(/\s+/g, ' ').trim();
}

// ---------------------------------------------------------------------------
// Parsers
// ---------------------------------------------------------------------------

const HREF_RE = /href="(\/Veiculo\/([^"]+)\/(\d+)\/detalhes)"/;

/** Listing page -> array of { id, slug, url, capa, marca, modelo } (document order, deduplicated by id). */
function parseListing(html) {
  const cards = html.split('<div class="result-item">').slice(1);
  const items = [];
  const seen = new Set();
  cards.forEach((card, i) => {
    const href = card.match(HREF_RE);
    if (!href) throw new Error(`listing card #${i + 1}: no vehicle href found`);
    const id = parseInt(href[3], 10);
    if (seen.has(id)) return;
    seen.add(id);
    const img = card.match(/<img src="([^"]+)"/);
    if (!img) throw new Error(`listing card #${i + 1} (id ${id}): no image found`);
    const title = card.match(/result-item-title-new"[^>]*>(.*?)<b[^>]*>(.*?)<\/b>/s);
    if (!title) throw new Error(`listing card #${i + 1} (id ${id}): no title found`);
    items.push({
      id,
      slug: href[2],
      url: href[1],
      capa: img[1],
      preco: parsePrice(card), // null quando o cartão não traz o preço
      marca: htmlUnescape(title[1]).trim(),
      modelo: htmlUnescape(title[2]).trim(),
    });
  });
  return items;
}

/** Any listing page -> Set of vehicle ids found in it. */
function parseHomeHighlights(html) {
  // ids dos cartões de "ÚLTIMAS NOVIDADES" na ordem em que aparecem (cada cartão tem 2 links; dedup mantém a ordem)
  const ids = [];
  for (const m of html.matchAll(/href="\/Veiculo\/[^"]+\/(\d+)\/detalhes"/g)) { const id = Number(m[1]); if (!ids.includes(id)) ids.push(id); }
  return ids;
}

function parseListingIds(html) {
  return new Set([...html.matchAll(new RegExp(HREF_RE.source, 'g'))].map((m) => parseInt(m[3], 10)));
}

function parsePrice(text) {
  const m = text.match(/([\d.]+),(\d{2})/);
  if (!m) return null;
  return Number(`${m[1].replace(/\./g, '')}.${m[2]}`);
}

/** Detail page -> full vehicle record (keys in the canonical output order). */
function parseDetail(html, item, tipo) {
  const problems = [];

  const title = html.match(
    /<h2 itemprop="name" class="post-title"><strong>(.*?)<b>(.*?)<\/b><\/strong><br \/>(.*?)<\/h2>/s,
  );
  if (!title) problems.push('title not found');
  const marca = title ? clean(title[1]) : null;
  const modelo = title ? clean(title[2]) : null;
  const titleVersion = title ? clean(title[3]) : '';

  const specs = {};
  for (const m of html.matchAll(/<span class="info">(.*?)<\/span><br>\s*<span class="info_destaque">(.*?)<\/span>/gs)) {
    specs[clean(m[1])] = clean(m[2]);
  }

  const priceBlock = html.match(/<div class="precoVeiculo"[^>]*>\s*<strong>(.*?)<\/strong>/s);
  const preco = priceBlock ? parsePrice(priceBlock[1]) : null;
  if (preco === null) problems.push(priceBlock ? `price unparseable: "${clean(priceBlock[1])}"` : 'price not found');

  const features = { Características: [], Opcionais: [] };
  for (const m of html.matchAll(/<strong>(Características|Opcionais)<\/strong>\s*<ul class="add-features-list">(.*?)<\/ul>/gs)) {
    features[m[1]] = [...m[2].matchAll(/<li[^>]*>(.*?)<\/li>/gs)].map((li) => clean(li[1])).filter(Boolean);
  }

  let descricao = [];
  const overview = html.match(/<div id="vehicle-overview".*?<p>(.*?)<\/p>/s);
  if (overview) {
    descricao = overview[1]
      .replaceAll('<strong>Informações do Veículo</strong>', '')
      .split(/<\s*\/?\s*br\s*\/?\s*>/)
      .map(clean)
      .filter(Boolean);
  }

  const fotos = [...html.matchAll(/<div class="swiper-slide" data-src="([^"]+)" data-order="(\d+)"/g)]
    .map((m) => ({ url: m[1], order: parseInt(m[2], 10) }))
    .sort((a, b) => a.order - b.order)
    .map((f) => f.url);
  if (fotos.length === 0) problems.push('zero photos');
  const PHOTO_HOST = /^https:\/\/www\.autocerto\.com\//;
  for (const f of fotos) if (!PHOTO_HOST.test(f)) { problems.push(`unexpected photo URL: ${f}`); break; }
  if (item.image && !PHOTO_HOST.test(item.image)) problems.push(`unexpected cover URL: ${item.image}`);

  const videoMatch = html.match(/youtube\.com\/embed\/([A-Za-z0-9_-]+)/);
  const video = videoMatch ? videoMatch[1] : null;

  const ano = (specs.Ano ?? '').match(/(\d{4})\/(\d{4})/);
  if (!ano) problems.push(`year unparseable: "${specs.Ano ?? ''}"`);
  const anoFabricacao = ano ? parseInt(ano[1], 10) : null;
  const anoModelo = ano ? parseInt(ano[2], 10) : null;

  const kmDigits = (specs.Km ?? '').replace(/\./g, '');
  if (!/^\d+$/.test(kmDigits)) problems.push(`km unparseable: "${specs.Km ?? ''}"`);
  const km = /^\d+$/.test(kmDigits) ? parseInt(kmDigits, 10) : null;

  if (problems.length) throw new Error(problems.join('; '));

  let versao = titleVersion.trim();
  const anoStr = String(anoModelo);
  if (versao.endsWith(` ${anoStr}`)) versao = versao.slice(0, -(anoStr.length + 1)).trim();
  if (versao === anoStr) versao = '';

  return {
    id: item.id,
    slug: item.slug,
    tipo,
    marca,
    modelo,
    versao,
    anoFabricacao,
    anoModelo,
    km,
    preco,
    cambio: specs['Câmbio'] ?? null,
    combustivel: specs['Combustível'] ?? null,
    caracteristicas: features['Características'],
    opcionais: features['Opcionais'],
    descricao,
    capa: item.capa,
    fotos,
    video,
    fonte: BASE_URL + item.url,
  };
}

function toIndexEntry(v) {
  return {
    id: v.id,
    slug: v.slug,
    tipo: v.tipo,
    marca: v.marca,
    modelo: v.modelo,
    versao: v.versao,
    anoFabricacao: v.anoFabricacao,
    anoModelo: v.anoModelo,
    km: v.km,
    preco: v.preco,
    cambio: v.cambio,
    combustivel: v.combustivel,
    capa: v.capa,
    capaId: capaId(v.capa), // nome da miniatura local: assets/thumbs/<id>-<capaId>.webp (muda se a loja trocar a capa)
    caracteristicas: v.caracteristicas,
    nFotos: v.fotos.length,
    video: v.video !== null,
  };
}
function capaId(url) { return String(url).split('/').pop().replace(/\.[a-z0-9]+$/i, '').replace(/[^A-Za-z0-9_-]/g, ''); }

// Python-style tuple sort on (marca, modelo, versao, id): plain code-point string comparison.
function compareStrings(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}
function compareVehicles(a, b) {
  return (
    compareStrings(a.marca, b.marca) ||
    compareStrings(a.modelo, b.modelo) ||
    compareStrings(a.versao, b.versao) ||
    a.id - b.id
  );
}

// ---------------------------------------------------------------------------
// Sources: live (fetch) or offline (--from-dir)
// ---------------------------------------------------------------------------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchText(url) {
  let lastError;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const backoff = 1000 * 2 ** (attempt - 1);
      console.error(`  retry ${attempt}/${MAX_RETRIES} in ${backoff} ms: ${url} (${lastError.message})`);
      await sleep(backoff);
    }
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9',
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!res.ok) {
        const retryable = res.status === 429 || res.status >= 500;
        const err = new Error(`HTTP ${res.status}`);
        if (!retryable) throw Object.assign(err, { fatal: true });
        throw err;
      }
      return await res.text();
    } catch (err) {
      if (err.fatal) throw new Error(`${url}: ${err.message}`);
      lastError = err;
    }
  }
  throw new Error(`${url}: ${lastError.message} (after ${MAX_RETRIES + 1} attempts)`);
}

function liveSource() {
  return {
    name: LISTING_URL,
    listing: () => fetchText(LISTING_URL),
    motoListing: () => fetchText(MOTO_LISTING_URL),
    home: () => fetchText(HOME_URL),
    detail: (item) => fetchText(BASE_URL + item.url),
    delayMs: DELAY_MS,
  };
}

function dirSource(dir) {
  const read = (p) => fs.readFileSync(p, 'utf8');
  return {
    name: dir,
    listing: async () => read(path.join(dir, 'Veiculos.html')),
    motoListing: async () => read(path.join(dir, 'motos.html')),
    home: async () => read(path.join(dir, 'home.html')),
    detail: async (item) => read(path.join(dir, 'detail', `${item.id}.html`)),
    delayMs: 0,
  };
}

/** Run fn over items with a fixed number of workers; each worker pauses delayMs between items. */
async function mapWithWorkers(items, concurrency, delayMs, fn) {
  const results = new Array(items.length);
  const failures = [];
  let next = 0;
  let done = 0;
  const report = () => {
    if (done % 10 === 0 || done === items.length) console.error(`  ${done}/${items.length} detail pages processed`);
  };
  const worker = async () => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      try {
        results[i] = await fn(items[i]);
      } catch (err) {
        failures.push({ item: items[i], error: err });
      }
      done++;
      report();
      if (delayMs > 0) await sleep(delayMs);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return { results, failures };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function summarize(vehicles) {
  const count = (key) => {
    const m = new Map();
    for (const v of vehicles) m.set(v[key], (m.get(v[key]) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1] || compareStrings(a[0], b[0]));
  };
  const lines = [`Total: ${vehicles.length} vehicles`, 'By tipo:'];
  for (const [k, n] of count('tipo')) lines.push(`  ${k.padEnd(8)} ${n}`);
  lines.push('By marca:');
  for (const [k, n] of count('marca')) lines.push(`  ${k.padEnd(16)} ${n}`);
  return lines.join('\n');
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    process.stdout.write(usage());
    return;
  }
  const date = opts.date ?? new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`--date must be YYYY-MM-DD, got "${date}"`);
  const outDir = opts.out ? path.resolve(opts.out) : path.join(REPO_ROOT, 'data');
  const source = opts.fromDir ? dirSource(path.resolve(opts.fromDir)) : liveSource();

  console.error(`Source: ${source.name}`);
  const listing = parseListing(await source.listing());
  console.error(`Listing: ${listing.length} vehicles`);
  if (listing.length === 0) throw new Error('listing page contains no vehicles');
  // Proteção contra listagem parcial (página quebrada, bloqueio, etc.): recusa queda brusca sem --force
  const prevPath = path.join(outDir, 'vehicles.json');
  if (!opts.force && fs.existsSync(prevPath)) {
    try {
      const prevTotal = JSON.parse(fs.readFileSync(prevPath, 'utf8')).total || 0;
      if (prevTotal >= 20 && listing.length < prevTotal * 0.5) {
        throw new Error(`listing has ${listing.length} vehicles but the previous sync had ${prevTotal}; refusing to overwrite (use --force if the drop is real)`);
      }
    } catch (e) { if (/refusing to overwrite/.test(e.message)) throw e; }
  }

  if (opts.checkOnly) return checkOnly(listing, source, outDir);

  const motoIds = parseListingIds(await source.motoListing());
  console.error(`Moto listing: ${motoIds.size} ids (${[...motoIds].join(', ') || 'none'})`);
  for (const id of motoIds) {
    if (!listing.some((it) => it.id === id)) console.error(`  warning: moto id ${id} is not present on the main listing`);
  }

  // "Últimas novidades" da home da fonte: só ids que existem na listagem, na ordem da loja
  const destaques = parseHomeHighlights(await source.home()).filter((id) => listing.some((it) => it.id === id));
  console.error(`Home highlights: ${destaques.length} ids (${destaques.join(', ') || 'none'})`);
  if (destaques.length === 0) console.error('  warning: no highlights found on the home page');

  const { results, failures } = await mapWithWorkers(listing, CONCURRENCY, source.delayMs, async (item) => {
    const html = await source.detail(item);
    const vehicle = parseDetail(html, item, motoIds.has(item.id) ? 'moto' : 'carro');
    if (vehicle.marca !== item.marca || vehicle.modelo !== item.modelo) {
      console.error(`  warning: id ${item.id}: listing says "${item.marca} ${item.modelo}", detail says "${vehicle.marca} ${vehicle.modelo}"`);
    }
    return vehicle;
  });

  // Anúncios com problema (sem fotos, preço ilegível, página fora do ar) são pulados com aviso; só aborta se forem muitos,
  // para um único anúncio incompleto não travar a atualização do estoque inteiro.
  const limite = Math.max(3, Math.ceil(listing.length * 0.05));
  if (failures.length) {
    console.error(`\n${failures.length} detail page(s) skipped:`);
    for (const f of failures) console.error(`  id ${f.item.id} (${BASE_URL}${f.item.url}): ${f.error.message}`);
    if (failures.length > limite) throw new Error(`${failures.length} of ${listing.length} detail pages failed (limit ${limite}); nothing written`);
  }
  const vehicles = results.filter(Boolean);
  if (vehicles.length === 0) throw new Error('no vehicle could be parsed; nothing written');
  const avisos = failures.map((f) => ({ id: f.item.id, url: BASE_URL + f.item.url, erro: f.error.message }));
  // anúncios pulados ficam registrados no índice (id, capa e preço da listagem) para o --check-only não
  // disparar uma sincronização completa a cada 5 minutos por causa deles; quando o anúncio mudar
  // (por exemplo, ganhar fotos), a capa muda e a sincronização roda
  const pulados = failures.map((f) => ({ id: f.item.id, capa: f.item.capa, preco: f.item.preco ?? null }));
  // destaques da home só com veículos que de fato entraram no estoque
  const destaquesFinais = destaques.filter((id) => vehicles.some((v) => v.id === id));

  vehicles.sort(compareVehicles);

  const vehiclesDoc = { atualizadoEm: date, fonte: LISTING_URL, total: vehicles.length, destaques: destaquesFinais, ...(avisos.length ? { avisos } : {}), veiculos: vehicles };
  const indexDoc = { atualizadoEm: date, total: vehicles.length, destaques: destaquesFinais, ...(pulados.length ? { pulados } : {}), veiculos: vehicles.map(toIndexEntry) };

  fs.mkdirSync(outDir, { recursive: true });
  const vehiclesPath = path.join(outDir, 'vehicles.json');
  const indexPath = path.join(outDir, 'index.json');
  fs.writeFileSync(vehiclesPath, JSON.stringify(vehiclesDoc, null, 1));
  fs.writeFileSync(indexPath, JSON.stringify(indexDoc, null, 1));

  console.log(`Wrote ${vehiclesPath}`);
  console.log(`Wrote ${indexPath}`);
  console.log(`atualizadoEm: ${date}`);
  console.log(summarize(vehicles));
}

/** Modo leve (a cada 5 minutos no Actions): compara a listagem com data/index.json sem baixar os detalhes. */
async function checkOnly(listing, source, outDir) {
  const indexPath = path.join(outDir, 'index.json');
  const idx = fs.existsSync(indexPath) ? JSON.parse(fs.readFileSync(indexPath, 'utf8')) : null;
  const destaques = parseHomeHighlights(await source.home()).filter((id) => listing.some((it) => it.id === id));
  const comPreco = listing.every((it) => it.preco != null);
  const chave = (id, capa, preco) => `${id}|${capa}|${comPreco ? Number(preco) : ''}`;
  // no índice, os anúncios pulados contam como estão na listagem (ver 'pulados' em main); destaques da home só
  // com veículos publicados, como o índice guarda
  const publicados = new Set(idx ? idx.veiculos.map((v) => v.id) : []);
  const destaquesAtual = destaques.filter((id) => publicados.has(id) || !(idx && (idx.pulados || []).some((p) => p.id === id)));
  const atual = listing.map((it) => chave(it.id, it.capa, it.preco)).sort().join('\n') + '\n#' + destaquesAtual.join(',');
  const gravado = idx ? [...idx.veiculos.map((v) => chave(v.id, v.capa, v.preco)), ...(idx.pulados || []).map((p) => chave(p.id, p.capa, p.preco))].sort().join('\n') + '\n#' + (idx.destaques || []).join(',') : '';
  const mudou = atual !== gravado;
  console.log(`check: ${mudou ? 'estoque mudou' : 'sem mudanças'} (listagem ${listing.length} veículos${comPreco ? ' com preço' : ''}, índice ${idx ? idx.total : 'inexistente'}, ${destaques.length} destaques)`);
  console.log(`mudou=${mudou}`);
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `mudou=${mudou}\n`);
}

main().catch((err) => {
  console.error(`\nERROR: ${err.message}`);
  process.exit(1);
});
