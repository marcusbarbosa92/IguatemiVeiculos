#!/usr/bin/env node
/**
 * sync-youtube.mjs — últimos vídeos do canal da loja em data/youtube.json.
 *
 * Lê o feed público do YouTube (feeds/videos.xml, sem chave de API), guarda os últimos vídeos com
 * id, título, data e se são verticais (Shorts), e só regrava o arquivo quando a lista muda.
 * A home usa o primeiro da lista no pop-up "vídeo novo". Sem dependências (Node >= 18).
 *
 * Uso: node scripts/sync-youtube.mjs [--root pasta] [--limit 6]
 *   --root: pasta do site (padrão: raiz do repositório; o build do Vercel passa dist/)
 * Sai com 0 mesmo quando o YouTube está fora do ar (mantém o arquivo atual e avisa), para não
 * derrubar o sync nem o deploy por causa de um vídeo.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 && args[i + 1] ? args[i + 1] : def; };
const ROOT = path.resolve(opt('--root', path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')));
const LIMIT = Math.max(1, Math.min(15, Number(opt('--limit', 6)) || 6));
const OUT = path.join(ROOT, 'data', 'youtube.json');
const STORE = (() => { const w = {}; new Function('window', fs.readFileSync(path.join(ROOT, 'assets/js/store.js'), 'utf8'))(w); return w.STORE; })();
const CANAL = STORE.youtube || {};
if (!CANAL.id) { console.log('sync-youtube: store.js sem youtube.id; nada a fazer.'); process.exit(0); }

const atual = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : null;
const desc = (s) => String(s || '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();

async function buscar(url, opts) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 20000);
  try { return await fetch(url, { ...opts, signal: ctl.signal, headers: { 'user-agent': 'Mozilla/5.0 (site da loja; sync-youtube)' } }); } finally { clearTimeout(t); }
}

let xml;
try {
  const r = await buscar(`https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(CANAL.id)}`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  xml = await r.text();
} catch (e) {
  console.log(`sync-youtube: não consegui ler o feed do canal (${e.message}); mantendo data/youtube.json como está.`);
  process.exit(0);
}

const entradas = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((m) => m[1]);
const videos = [];
for (const e of entradas.slice(0, LIMIT)) {
  const id = (e.match(/<yt:videoId>([^<]+)/) || [])[1];
  const titulo = desc((e.match(/<title>([^<]*)/) || [])[1]);
  const publicadoEm = ((e.match(/<published>([^<]+)/) || [])[1] || '').slice(0, 10);
  if (!id || !titulo) continue;
  // Shorts: a URL /shorts/<id> responde direto; vídeo comum redireciona para /watch
  let vertical = false;
  const anterior = atual && (atual.videos || []).find((v) => v.id === id);
  if (anterior && typeof anterior.vertical === 'boolean') vertical = anterior.vertical;
  else {
    try { const r = await buscar(`https://www.youtube.com/shorts/${id}`, { redirect: 'follow' }); vertical = r.ok && /\/shorts\//.test(r.url); } catch (err) { vertical = false; }
  }
  videos.push({ id, titulo, publicadoEm, vertical, url: vertical ? `https://www.youtube.com/shorts/${id}` : `https://www.youtube.com/watch?v=${id}` });
}
if (!videos.length) { console.log('sync-youtube: feed sem vídeos; mantendo o arquivo atual.'); process.exit(0); }

const novo = {
  _origem: 'Gerado por scripts/sync-youtube.mjs a partir do feed público do canal (sem chave de API). Não edite à mão.',
  canal: { id: CANAL.id, nome: desc((xml.match(/<title>([^<]*)<\/title>/) || [])[1]) || STORE.nome, url: STORE.links.youtube },
  ultimo: videos[0],
  videos,
};
const mesmo = atual && JSON.stringify(atual.videos) === JSON.stringify(novo.videos) && JSON.stringify(atual.canal) === JSON.stringify(novo.canal);
if (mesmo) { console.log(`sync-youtube: sem vídeo novo (último: ${videos[0].publicadoEm} · ${videos[0].titulo}).`); process.exit(0); }
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(novo, null, 1) + '\n');
console.log(`sync-youtube: ${videos.length} vídeo(s) gravados; último: ${videos[0].publicadoEm} · ${videos[0].titulo}${videos[0].vertical ? ' (Short)' : ''}.`);
