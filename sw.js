/* Service worker: deixa repetições de visita mais rápidas e o site navegável sem rede.
   HTML, JS, CSS e JSON: rede primeiro (sempre fresco), cache como reserva offline.
   Imagens, vídeo e fontes: cache primeiro (mudam de nome quando mudam). */
const VERSAO = "v1";
const CACHE = "iguatemi-" + VERSAO;
const IMG = /\.(?:webp|png|jpe?g|svg|gif|mp4|webm|woff2?)(?:\?.*)?$/i;

self.addEventListener("install", (e) => { self.skipWaiting(); });
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith("iguatemi-") && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const mesmaOrigem = url.origin === self.location.origin;
  const fonte = /fonts\.(?:googleapis|gstatic)\.com$/.test(url.hostname);
  const fotoAutocerto = url.hostname === "www.autocerto.com";
  if (!mesmaOrigem && !fonte && !fotoAutocerto) return; // analytics, mapas, YouTube: sem cache
  if (fonte || fotoAutocerto || (mesmaOrigem && IMG.test(url.pathname))) {
    e.respondWith(caches.open(CACHE).then(async (c) => {
      const hit = await c.match(req); if (hit) return hit;
      try { const res = await fetch(req); if (res && (res.ok || res.type === "opaque")) c.put(req, res.clone()); return res; } catch (err) { return hit || Response.error(); }
    }));
    return;
  }
  if (mesmaOrigem) {
    e.respondWith(caches.open(CACHE).then(async (c) => {
      try { const res = await fetch(req); if (res && res.ok) c.put(req, res.clone()); return res; }
      catch (err) { const hit = await c.match(req, { ignoreSearch: url.pathname.endsWith(".html") }); return hit || new Response("<!doctype html><meta charset=utf-8><title>Sem conexão</title><p style='font:16px system-ui;padding:24px'>Você está sem conexão. Tente de novo quando a internet voltar.</p>", { status: 503, headers: { "content-type": "text/html; charset=utf-8" } }); }
    }));
  }
});
