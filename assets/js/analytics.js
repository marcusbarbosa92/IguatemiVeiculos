/* analytics.js — GA4 + Meta Pixel (IDs em store.js) e eventos de contato.
   Eventos enviados: contato_whatsapp, contato_telefone, contato_email, contato_instagram (Direct), clique_instagram, clique_rede_social, play_video,
   envio_formulario, view_item (página do veículo). Respeita Do Not Track / Global Privacy Control. */
(function () {
  "use strict";
  var S = window.STORE, cfg = S && S.analytics;
  if (!cfg || (!cfg.ga4 && !cfg.metaPixel)) return;
  if (navigator.doNotTrack === "1" || window.doNotTrack === "1" || navigator.globalPrivacyControl) return;
  var consent = window.App && window.App.Consent ? window.App.Consent.get() : null;
  if (consent === "necessary") return; // o visitante pediu só o essencial: nada de medição

  var page = (location.pathname.split("/").pop() || "index.html");
  var vid = document.body.getAttribute("data-vehicle-id") || new URLSearchParams(location.search).get("id") || null;
  var granted = { ad_storage: "granted", ad_user_data: "granted", ad_personalization: "granted", analytics_storage: "granted" };
  var denied = { ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied", analytics_storage: "denied" };

  if (cfg.ga4) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    // Consent Mode: sem consentimento, o GA4 só envia sinais sem cookies; ao aceitar, libera tudo
    window.gtag("consent", "default", consent === "all" ? granted : denied);
    window.gtag("js", new Date());
    window.gtag("config", cfg.ga4, { anonymize_ip: true, send_page_view: true });
    // o script do Google (~600 KB) só é baixado depois da primeira interação ou do aceite, para não pesar na abertura
    var gtagOn = false;
    var loadGtag = function () { if (gtagOn) return; gtagOn = true; var g = document.createElement("script"); g.async = true; g.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(cfg.ga4); document.head.appendChild(g); };
    if (consent === "all") loadGtag();
    else { ["pointerdown", "keydown", "scroll", "touchstart"].forEach(function (ev) { window.addEventListener(ev, loadGtag, { once: true, passive: true }); }); document.addEventListener("consent:change", loadGtag); }
  }
  var pixelOn = false;
  function startPixel() {
    if (pixelOn || !cfg.metaPixel) return; pixelOn = true;
    /* código oficial do Meta Pixel, sem alterações além do ID vindo de store.js; só roda com consentimento */
    !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s); }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
    window.fbq("init", cfg.metaPixel);
    window.fbq("track", "PageView");
  }
  if (consent === "all") startPixel();
  document.addEventListener("consent:change", function (e) {
    if (e.detail === "all") { if (window.gtag) window.gtag("consent", "update", granted); startPixel(); }
  });

  function track(name, params, fbEvent) {
    params = Object.assign({ pagina: page }, params || {});
    if (vid) params.veiculo_id = vid;
    try { if (window.gtag) window.gtag("event", name, params); } catch (e) { /* ignora */ }
    try { if (window.fbq) { if (fbEvent) window.fbq("track", fbEvent, params); else window.fbq("trackCustom", name, params); } } catch (e) { /* ignora */ }
  }
  function origem(el) {
    if (el.closest(".bottom-nav")) return "barra_inferior";
    if (el.closest(".sticky-cta")) return "cta_fixa";
    if (el.closest(".site-header")) return "cabecalho";
    if (el.closest(".drawer")) return "menu";
    if (el.closest(".v-card")) return "cartao";
    if (el.closest(".cta-row")) return "pagina_veiculo";
    if (el.closest(".site-footer")) return "rodape";
    if (el.closest(".insta-strip")) return "faixa_instagram";
    if (el.closest("form")) return "formulario";
    return "pagina";
  }
  document.addEventListener("click", function (e) {
    var a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
    if (!a) return;
    var h = a.href || "", o = { origem: origem(a) };
    if (/wa\.me|api\.whatsapp\.com|whatsapp:/.test(h)) track("contato_whatsapp", o, "Contact");
    else if (h.indexOf("tel:") === 0) track("contato_telefone", o, "Contact");
    else if (h.indexOf("mailto:") === 0) track("contato_email", o, "Contact");
    else if (/ig\.me\/m\//.test(h)) track("contato_instagram", o, "Contact");
    else if (/instagram\.com/.test(h)) track("clique_instagram", o);
    else if (/facebook\.com|youtube\.com|tiktok\.com/.test(h)) track("clique_rede_social", Object.assign({ rede: (h.match(/(facebook|youtube|tiktok)/) || [])[1] }, o));
  }, true);
  document.addEventListener("submit", function (e) {
    var f = e.target;
    if (!f || !f.matches || !f.matches("form[data-wa-form]")) return;
    if (f.checkValidity && !f.checkValidity()) return;
    track("envio_formulario", { formulario: f.getAttribute("data-wa-form") }, "Lead");
  }, true);
  document.addEventListener("veiculo:video", function (e) { track("play_video", { content_ids: [String(e.detail && e.detail.id)] }); });
  document.addEventListener("fav:change", function (e) { track(e.detail && e.detail.on ? "salvar_veiculo" : "remover_salvo", { veiculo_salvo: e.detail && e.detail.id, total_salvos: e.detail && e.detail.total }); });
  // visualização de veículo só quando a página renderizou de fato (id inexistente = "não encontrado", não conta)
  document.addEventListener("veiculo:render", function (e) { var id = String(e.detail && e.detail.id || vid); track("view_item", { content_ids: [id], content_type: "product" }, "ViewContent"); });
})();
