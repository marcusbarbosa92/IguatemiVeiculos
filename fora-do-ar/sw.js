/* Service worker de saída: substitui o sw.js do site enquanto ele está fora do ar.
   Ao chegar no navegador de quem já visitou o site, apaga os caches guardados, se desregistra e
   recarrega as abas abertas, para ninguém continuar vendo páginas antigas vindas do cache.
   (Safari até a versão 15 não deixa recarregar a aba daqui; nele a aba fica como está até o
   visitante navegar, e aí já recebe a página preta direto da rede.)
   Não intercepta requisições: tudo vai direto à rede (e recebe a página preta).
   O build publica este arquivo sem os comentários. */
self.addEventListener("install", () => { self.skipWaiting(); });
self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    try { for (const chave of await caches.keys()) await caches.delete(chave); } catch (err) { /* sem acesso ao cache */ }
    try { await self.clients.claim(); } catch (err) { /* sem abas para assumir */ }
    try { await self.registration.unregister(); } catch (err) { /* já desregistrado */ }
    try {
      for (const aba of await self.clients.matchAll({ type: "window" })) {
        try { await aba.navigate(aba.url); } catch (err) { /* aba que não pode ser recarregada daqui */ }
      }
    } catch (err) { /* sem abas abertas */ }
  })());
});
