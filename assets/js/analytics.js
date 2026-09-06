/* analytics.js — GA4 + Meta Pixel (IDs em store.js) e eventos de contato.
   Eventos enviados: contato_whatsapp, contato_telefone, contato_email, clique_instagram, clique_rede_social,
   envio_formulario, view_item (página do veículo). Respeita Do Not Track / Global Privacy Control. */
(function () {
  "use strict";
  var S = window.STORE, cfg = S && S.analytics;
  if (!cfg || (!cfg.ga4 && !cfg.metaPixel)) return;
  if (navigator.doNotTrack === "1" || window.doNotTrack === "1" || navigator.globalPrivacyControl) return;

  var page = (location.pathname.split("/").pop() || "index.html");
  var vid = document.body.getAttribute("data-vehicle-id") || new URLSearchParams(location.search).get("id") || null;

  if (cfg.ga4) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", cfg.ga4, { anonymize_ip: true, send_page_view: true });
    var g = document.createElement("script"); g.async = true; g.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(cfg.ga4); document.head.appendChild(g);
  }
  if (cfg.metaPixel) {
    /* código oficial do Meta Pixel, sem alterações além do ID vindo de store.js */
    !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s); }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
    window.fbq("init", cfg.metaPixel);
    window.fbq("track", "PageView");
  }

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
    else if (/instagram\.com/.test(h)) track("clique_instagram", o);
    else if (/facebook\.com|youtube\.com|tiktok\.com/.test(h)) track("clique_rede_social", Object.assign({ rede: (h.match(/(facebook|youtube|tiktok)/) || [])[1] }, o));
  }, true);
  document.addEventListener("submit", function (e) {
    var f = e.target;
    if (!f || !f.matches || !f.matches("form[data-wa-form]")) return;
    if (f.checkValidity && !f.checkValidity()) return;
    track("envio_formulario", { formulario: f.getAttribute("data-wa-form") }, "Lead");
  }, true);
  document.addEventListener("fav:change", function (e) { track(e.detail && e.detail.on ? "salvar_veiculo" : "remover_salvo", { veiculo_salvo: e.detail && e.detail.id, total_salvos: e.detail && e.detail.total }); });
  if (vid) track("view_item", { content_ids: [String(vid)], content_type: "product" }, "ViewContent");
})();
