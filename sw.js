/* Service worker: deixa repetições de visita mais rápidas e o site navegável sem rede.
   HTML, JS, CSS e JSON: rede primeiro (sempre fresco), cache como reserva offline.
   Imagens, vídeo e fontes da própria origem: cache com revalidação em segundo plano.
   Fotos da AutoCerto e scripts de terceiros: sem cache aqui (fica o cache HTTP do navegador).
   Mudar VERSAO descarta o cache antigo em todos os visitantes. */
const VERSAO = "v3";
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
  // fotos da AutoCerto e outros terceiros ficam com o cache HTTP do navegador (respostas opacas consomem cota demais)
  if (!mesmaOrigem && !fonte) return;
  if (fonte || (mesmaOrigem && IMG.test(url.pathname))) {
    // responde do cache e atualiza em segundo plano (stale-while-revalidate): uma imagem trocada no deploy chega na visita seguinte
    e.respondWith(caches.open(CACHE).then(async (c) => {
      const hit = await c.match(req);
      const rede = fetch(req).then(async (res) => { if (res && res.ok) { try { await c.put(req, res.clone()); } catch (err) { /* cota cheia */ } } return res; }).catch(() => null);
      if (hit) { e.waitUntil(rede); return hit; }
      const res = await rede; return res || Response.error();
    }));
    return;
  }
  if (mesmaOrigem) {
    e.respondWith(caches.open(CACHE).then(async (c) => {
      try { const res = await fetch(req); if (res && res.ok) { try { await c.put(req, res.clone()); } catch (err) { /* cota cheia */ } } return res; }
      catch (err) { const hit = await c.match(req, { ignoreSearch: url.pathname.endsWith(".html") }); return hit || new Response("<!doctype html><meta charset=utf-8><title>Sem conexão</title><p style='font:16px system-ui;padding:24px'>Você está sem conexão. Tente de novo quando a internet voltar.</p>", { status: 503, headers: { "content-type": "text/html; charset=utf-8" } }); }
    }));
  }
});
