/* veiculo.js — página de detalhes (v/<id>.html com dados embutidos, ou veiculo.html?id= com fetch) */
(function () {
  "use strict";
  const A = window.App, S = window.STORE, $ = A.$, $$ = A.$$, esc = A.esc, icon = A.icon;
  const TAG_STYLE = { "Blindado": "red", "Único Dono": "soft", "7 lugares": "soft", "Garantia de Fábrica": "soft" };
  const PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='3'%3E%3C/svg%3E";
  // Parágrafos institucionais que a AutoCerto repete em todos os anúncios: já aparecem em "Compra segura" e no rodapé.
  const PADRAO = [/^ve[ií]culos de proced[êe]ncia comprovada/i, /^n[ãa]o trabalhamos com ve[ií]culos de leil[ãa]o/i, /^todos os ve[ií]culos possuem laudo cautelar/i, /^pagamentos exclusivamente no cnpj/i, /^reservamo-nos o direito de corrigir/i];

  function notFound(msg) {
    document.title = "Veículo não encontrado · " + S.nome;
    $("#vehicle").innerHTML = '<div class="container not-found">' + icon("car") + "<h1>" + esc(msg || "Veículo não encontrado") + "</h1><p class=\"muted\">Ele pode já ter sido vendido ou o link está incorreto. Veja o que temos disponível agora.</p><a class=\"btn btn-primary btn-lg\" href=\"estoque.html\">Ver estoque</a><a class=\"btn btn-wa\" href=\"" + A.waLink() + '" target="_blank" rel="noopener">' + icon("whatsapp") + " Falar no WhatsApp</a></div>";
    $("#sticky-cta").hidden = true; document.body.classList.remove("has-sticky-cta");
  }

  function render(v, all, semelhantesPre) {
    const name = A.vehName(v), curto = v.marca + " " + v.modelo + " " + v.anoFabricacao + "/" + v.anoModelo, wa = A.waLink(A.waVehicleMsg(v));
    document.title = curto + " · " + A.fmtBRL(v.preco) + " · " + S.nome;
    const desc = name + " por " + A.fmtBRL(v.preco) + ". " + A.fmtKm(v.km) + ", " + v.cambio + ", " + v.combustivel + ". " + S.nome + ", Campinas - SP.";
    const setMeta = (sel, val) => { const m = document.querySelector(sel); if (m) m.setAttribute("content", val); };
    setMeta('meta[name="description"]', desc); setMeta('meta[property="og:title"]', curto + " · " + A.fmtBRL(v.preco)); setMeta('meta[property="og:description"]', desc); setMeta('meta[property="og:image"]', v.capa);
    const canonical = A.absUrl(A.vehUrl(v));
    let link = document.querySelector('link[rel="canonical"]'); if (!link) { link = document.createElement("link"); link.rel = "canonical"; document.head.appendChild(link); } link.href = canonical;
    const has = (c) => Object.prototype.hasOwnProperty.call(TAG_STYLE, c);
    const tags = (v.caracteristicas || []).filter(has);
    const chars = (v.caracteristicas || []).filter((c) => !has(c));
    const especificas = (v.descricao || []).filter((p) => !PADRAO.some((re) => re.test(p.trim())));
    const n = v.fotos.length;
    const slideSrc = (f) => (f === v.capa ? A.thumbUrl(v) : null); // capa local em 800 px; as demais só quando chegam perto

    $("#vehicle").innerHTML =
      '<div class="container v-layout">' +
      '<div class="v-main-top">' +
      '<div class="gallery" id="gallery" role="region" aria-label="Fotos do veículo"><div class="track" id="g-track">' + v.fotos.map((f, i) => { const local = slideSrc(f); return '<button type="button" tabindex="-1" data-i="' + i + '" aria-label="Abrir foto ' + (i + 1) + ' em tela cheia"><img ' + (local ? 'src="' + local + '" data-fallback="' + esc(f) + '" fetchpriority="high"' : 'src="' + PLACEHOLDER + '" data-src="' + esc(f) + '"') + ' alt="' + esc(name) + " — foto " + (i + 1) + '" decoding="async"></button>'; }).join("") + "</div>" +
      '<button class="g-nav prev" type="button" id="g-prev" aria-label="Foto anterior">' + icon("chevL") + '</button><button class="g-nav next" type="button" id="g-next" aria-label="Próxima foto">' + icon("chevR") + "</button>" +
      '<div class="counter" id="g-counter" aria-live="polite" aria-atomic="true">1/' + n + "</div>" +
      '<button class="btn btn-sm btn-outline-light g-full" type="button" id="g-full">' + icon("image") + " Ver todas as fotos</button></div>" +
      '<div class="thumbs" id="thumbs" role="group" aria-label="Miniaturas">' + v.fotos.map((f, i) => '<button type="button" data-i="' + i + '"' + (i === 0 ? ' class="on" aria-current="true" tabindex="0"' : ' tabindex="-1"') + ' aria-label="Foto ' + (i + 1) + ' de ' + n + '"><img src="' + A.fotoThumbUrl(v, f) + '" data-fallback="' + esc(f) + '" alt="" loading="lazy" decoding="async" width="64" height="48"></button>').join("") + "</div>" +
      '<div class="v-head"><nav class="breadcrumb" aria-label="Você está em"><a href="estoque.html">Estoque</a><span aria-hidden="true">›</span><a href="estoque.html?marca=' + encodeURIComponent(v.marca) + '">' + esc(v.marca) + '</a><span aria-hidden="true">›</span><a href="estoque.html?marca=' + encodeURIComponent(v.marca) + "&modelo=" + encodeURIComponent(v.modelo) + '" aria-current="page">' + esc(v.modelo) + "</a></nav>" +
      '<h1><img class="brand-logo" src="' + A.brandLogo(v.marca, v.tipo) + '" alt="" width="44" height="44" onerror="this.remove()"><small>' + esc(v.marca) + " </small>" + esc(v.modelo) + "</h1>" + (v.versao ? '<div class="version">' + esc(v.versao) + "</div>" : "") +
      '<div class="tags">' + tags.map((t) => '<span class="badge ' + TAG_STYLE[t] + '">' + esc(t) + "</span>").join("") + chars.map((t) => '<span class="badge gray">' + esc(t) + "</span>").join("") + "</div></div>" +
      '<div class="specs">' + [["calendar", "Ano", v.anoFabricacao + "/" + v.anoModelo], ["gauge", "Km", A.fmtNum(v.km)], ["gear", "Câmbio", v.cambio], ["fuel", "Combustível", v.combustivel]].map((s) => '<div class="spec"><div class="fi">' + icon(s[0]) + "</div><div><span>" + s[1] + "</span><b>" + esc(s[2]) + "</b></div></div>").join("") + "</div>" +
      "</div>" +
      '<aside class="v-side">' +
      '<div class="cta-block">' +
      '<div class="price-box"><div><div class="p"><small>R$</small>' + A.fmtBRL(v.preco).replace(/^R\$\s?/, "") + '</div><div class="lbl">Valor do veículo</div></div><div class="price-actions">' + A.Fav.button(v.id, "btn btn-icon btn-outline") + '<button class="btn btn-icon btn-outline" type="button" id="btn-share" aria-label="Compartilhar">' + icon("share") + "</button></div></div>" +
      '<div class="cta-row"><a class="btn btn-wa btn-lg" href="' + wa + '" target="_blank" rel="noopener">' + icon("whatsapp") + ' Tenho interesse</a><a class="btn btn-dark btn-lg" href="' + A.telLink + '">' + icon("phone") + " Ligar agora</a>" +
      '<div class="row2"><button class="btn btn-outline" type="button" id="btn-sim">' + icon("calc") + ' Proposta de financiamento</button><a class="btn btn-outline" href="venda-seu-veiculo.html">' + icon("tag") + " Vender meu veículo</a></div></div>" +
      "</div>" +
      '<section class="block trust" id="trust"><h2>Compra segura</h2><ul class="opt-grid" style="grid-template-columns:1fr">' + S.garantias.filter((g) => !/garantia/i.test(g.titulo)).map((g) => "<li>" + icon("shield") + "<span><b>" + esc(g.titulo) + "</b><br>" + esc(g.texto) + "</span></li>").join("") + "</ul></section>" +
      "</aside>" +
      '<div class="v-main-rest">' +
      (v.opcionais && v.opcionais.length ? '<section class="block"><h2>Opcionais <span class="muted small">(' + v.opcionais.length + ')</span></h2><ul class="opt-grid' + (v.opcionais.length > 10 ? " collapsed" : "") + '" id="opt-list">' + v.opcionais.map((o) => "<li>" + icon("check") + esc(o) + "</li>").join("") + "</ul>" + (v.opcionais.length > 10 ? '<button class="expand" type="button" id="opt-toggle" aria-expanded="false">Ver todos os opcionais ' + icon("chevD") + "</button>" : "") + "</section>" : "") +
      (especificas.length ? '<section class="block desc"><h2>Informações do veículo</h2>' + especificas.map((p) => "<p>" + esc(p) + "</p>").join("") + "</section>" : "") +
      (v.video ? '<section class="block"><h2>Vídeo</h2><div class="yt" id="yt"><img src="https://i.ytimg.com/vi/' + esc(v.video) + '/hqdefault.jpg" alt="Vídeo do ' + esc(A.vehShort(v)) + '" loading="lazy"><button class="play" type="button" id="yt-play" aria-label="Reproduzir vídeo"><span>' + icon("play") + "</span></button></div></section>" : "") +
      '<p class="small muted" style="margin-top:14px">Anúncio nº ' + v.id + ". Valores e opcionais sujeitos a confirmação com a loja.</p>" +
      "</div></div>";

    $("#sticky-cta").hidden = false;
    $("#sticky-cta").setAttribute("role", "region"); $("#sticky-cta").setAttribute("aria-label", "Contato rápido");
    $("#sticky-cta").innerHTML = '<div class="sp"><b>' + A.fmtBRL(v.preco) + "</b><span>" + esc(v.marca + " " + v.modelo) + '</span></div><a class="btn btn-icon btn-dark" href="' + A.telLink + '" aria-label="Ligar">' + icon("phone") + '</a><a class="btn btn-wa" href="' + wa + '" target="_blank" rel="noopener">' + icon("whatsapp") + " WhatsApp</a>";

    /* galeria: só a foto atual e as vizinhas são baixadas */
    const track = $("#g-track");
    const slides = $$("#g-track img");
    const loadSlide = (i) => { const im = slides[i]; if (im && im.dataset.src) { im.src = im.dataset.src; delete im.dataset.src; } };
    const loadAround = (i) => { loadSlide(i); loadSlide(i + 1); loadSlide(i - 1); };
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { loadSlide(+e.target.dataset.i); io.unobserve(e.target); } }), { root: track, rootMargin: "0px 60% 0px 60%" });
      $$("#g-track > button").forEach((b) => io.observe(b));
    } else loadAround(0);
    let idx = 0;
    const goTo = (i, smooth) => { i = (i + n) % n; loadAround(i); track.scrollTo({ left: i * track.clientWidth, behavior: smooth === false ? "auto" : "smooth" }); };
    const thumbsEl = $("#thumbs");
    const setThumb = (i) => { $$("#thumbs button").forEach((b, k) => { const on = k === i; b.classList.toggle("on", on); b.tabIndex = on ? 0 : -1; if (on) b.setAttribute("aria-current", "true"); else b.removeAttribute("aria-current"); }); const tb = $$("#thumbs button")[i]; if (tb) thumbsEl.scrollTo({ left: tb.offsetLeft - thumbsEl.clientWidth / 2 + tb.offsetWidth / 2, behavior: "smooth" }); };
    track.addEventListener("scroll", () => { const i = Math.round(track.scrollLeft / track.clientWidth); if (i !== idx) { idx = i; loadAround(idx); $("#g-counter").textContent = (idx + 1) + "/" + n; setThumb(idx); } }, { passive: true });
    $("#g-full").addEventListener("click", () => openLightbox(idx));
    $("#g-prev").addEventListener("click", () => goTo(idx - 1)); $("#g-next").addEventListener("click", () => goTo(idx + 1));
    $$("#thumbs button").forEach((b) => { b.addEventListener("click", () => goTo(+b.dataset.i)); b.addEventListener("dblclick", () => openLightbox(+b.dataset.i)); });
    thumbsEl.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openLightbox(idx); } });
    $$("#g-track > button").forEach((b) => b.addEventListener("click", () => openLightbox(+b.dataset.i)));
    document.addEventListener("keydown", (e) => { if ($("#lightbox").classList.contains("open") || $(".sheet.open") || (e.target && e.target.matches && e.target.matches("input, select, textarea"))) return; if (e.key === "ArrowLeft") goTo(idx - 1); if (e.key === "ArrowRight") goTo(idx + 1); });

    /* tela cheia: fotos carregadas sob demanda; fecha com X, Escape, toque fora da foto ou arrastar para baixo */
    const lb = $("#lightbox"), lbTrack = $("#lb-track");
    lbTrack.innerHTML = v.fotos.map((f, i) => '<div data-i="' + i + '"><img src="' + PLACEHOLDER + '" data-src="' + esc(f) + '" alt="' + esc(name) + " — foto " + (i + 1) + '" decoding="async"></div>').join("");
    const lbImgs = $$("#lb-track img");
    const lbLoad = (i) => [i - 1, i, i + 1].forEach((k) => { const im = lbImgs[k]; if (im && im.dataset.src) { im.src = im.dataset.src; delete im.dataset.src; } });
    let lbIdx = 0, lbOpener = null;
    $("#lb-counter").setAttribute("aria-live", "polite");
    const trapLb = (e) => { if (e.key !== "Tab") return; const items = $$("button", lb).filter((b) => b.offsetParent !== null); if (!items.length) return; const f = items[0], l = items[items.length - 1]; if (e.shiftKey && document.activeElement === f) { e.preventDefault(); l.focus(); } else if (!e.shiftKey && document.activeElement === l) { e.preventDefault(); f.focus(); } };
    function openLightbox(i) { lbOpener = document.activeElement; lbLoad(i); lb.classList.add("open"); lb.setAttribute("aria-hidden", "false"); document.body.style.overflow = "hidden"; requestAnimationFrame(() => { lbTrack.scrollTo({ left: i * lbTrack.clientWidth, behavior: "auto" }); lbIdx = i; $("#lb-counter").textContent = (i + 1) + "/" + n; }); $("#lb-close").focus(); document.addEventListener("keydown", trapLb); }
    function closeLightbox() { lb.classList.remove("open"); lb.setAttribute("aria-hidden", "true"); document.body.style.overflow = ""; document.removeEventListener("keydown", trapLb); goTo(lbIdx, false); const t = $$("#thumbs button")[lbIdx]; if (t) t.focus(); else if (lbOpener && lbOpener.focus) lbOpener.focus(); }
    const lbGo = (i) => { i = (i + n) % n; lbLoad(i); lbTrack.scrollTo({ left: i * lbTrack.clientWidth, behavior: "smooth" }); };
    lbTrack.addEventListener("scroll", () => { const i = Math.round(lbTrack.scrollLeft / lbTrack.clientWidth); if (i !== lbIdx) { lbIdx = i; lbLoad(i); $("#lb-counter").textContent = (i + 1) + "/" + n; } }, { passive: true });
    lbTrack.addEventListener("click", (e) => { if (e.target === lbTrack || (e.target.tagName === "DIV" && e.target.parentElement === lbTrack)) closeLightbox(); });
    let ty = null; lbTrack.addEventListener("touchstart", (e) => { ty = e.touches[0].clientY; }, { passive: true }); lbTrack.addEventListener("touchend", (e) => { if (ty !== null && e.changedTouches[0].clientY - ty > 90) closeLightbox(); ty = null; }, { passive: true });
    $("#lb-close").addEventListener("click", closeLightbox); $("#lb-prev").addEventListener("click", () => lbGo(lbIdx - 1)); $("#lb-next").addEventListener("click", () => lbGo(lbIdx + 1));
    document.addEventListener("keydown", (e) => { if (!lb.classList.contains("open")) return; if (e.key === "Escape") closeLightbox(); if (e.key === "ArrowLeft") lbGo(lbIdx - 1); if (e.key === "ArrowRight") lbGo(lbIdx + 1); });

    /* opcionais */
    const tg = $("#opt-toggle");
    if (tg) tg.addEventListener("click", () => { const c = $("#opt-list").classList.toggle("collapsed"); tg.setAttribute("aria-expanded", c ? "false" : "true"); tg.innerHTML = (c ? "Ver todos os opcionais " : "Ver menos ") + icon("chevD"); });

    /* vídeo */
    const yp = $("#yt-play");
    if (yp) yp.addEventListener("click", () => { $("#yt").innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + esc(v.video) + '?autoplay=1&rel=0" title="Vídeo do veículo" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>'; });

    /* compartilhar */
    $("#btn-share").addEventListener("click", async () => {
      const url = canonical, text = name + " · " + A.fmtBRL(v.preco) + " · " + S.nome;
      if (navigator.share) { try { await navigator.share({ title: text, text: text, url: url }); } catch (e) { /* cancelado */ } }
      else { try { await navigator.clipboard.writeText(url); A.toast("Link copiado!"); } catch (e) { window.prompt("Copie o link do veículo:", url); } }
    });

    /* proposta de financiamento */
    const sim = A.sheet("sim");
    $("#sim-veiculo").value = name; $("#sim-valor").value = A.fmtBRL(v.preco);
    $("#btn-sim").addEventListener("click", () => sim.open());
    const ent = $("#sim-entrada");
    ent.addEventListener("input", () => { const d = ent.value.replace(/\D/g, ""); ent.value = d ? A.fmtNum(+d) : ""; });

    /* semelhantes (pré-calculados na página gerada, ou pela mesma regra aqui) */
    let sim1 = semelhantesPre || all.filter((x) => x.id !== v.id && x.modelo === v.modelo && x.marca === v.marca);
    if (!semelhantesPre && sim1.length < 4) sim1 = sim1.concat(all.filter((x) => x.id !== v.id && x.marca === v.marca && x.modelo !== v.modelo && x.tipo === v.tipo));
    if (!semelhantesPre && sim1.length < 4) sim1 = sim1.concat(all.filter((x) => x.id !== v.id && x.tipo === v.tipo && !sim1.includes(x) && Math.abs(x.preco - v.preco) / v.preco <= 0.2).sort((a, b) => Math.abs(a.preco - v.preco) - Math.abs(b.preco - v.preco)));
    sim1 = sim1.slice(0, 6);
    if (sim1.length) { $("#similar-wrap").hidden = false; $("#similar").innerHTML = sim1.map((x) => A.vehicleCard({ ...x, nFotos: x.fotos ? x.fotos.length : x.nFotos })).join(""); }

    /* nota do Google, se preenchida em data/avaliacoes.json */
    A.loadReviews().then((d) => { if (!d) return; $("#trust").insertAdjacentHTML("beforeend", '<div style="margin-top:12px">' + A.googleBadge(d) + "</div>"); });

    document.dispatchEvent(new CustomEvent("veiculo:render", { detail: { id: v.id } }));

    /* JSON-LD (as páginas geradas já trazem o seu) */
    if (!document.querySelector('script[type="application/ld+json"]')) {
      const ld = { "@context": "https://schema.org", "@type": v.tipo === "moto" ? "Motorcycle" : "Car", name: name, brand: { "@type": "Brand", name: v.marca }, model: v.modelo, vehicleConfiguration: v.versao || undefined, productionDate: String(v.anoFabricacao), vehicleModelDate: String(v.anoModelo), mileageFromOdometer: { "@type": "QuantitativeValue", value: v.km, unitCode: "KMT" }, vehicleTransmission: v.cambio, fuelType: v.combustivel, image: v.fotos.slice(0, 5), url: canonical, sku: String(v.id), itemCondition: "https://schema.org/UsedCondition", offers: { "@type": "Offer", price: v.preco, priceCurrency: "BRL", availability: "https://schema.org/InStock", url: canonical, seller: { "@type": "AutoDealer", name: S.nome, telephone: S.telefone.e164 } } };
      const s = document.createElement("script"); s.type = "application/ld+json"; s.textContent = JSON.stringify(ld); document.head.appendChild(s);
    }
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const id = +(document.body.dataset.vehicleId || new URLSearchParams(location.search).get("id") || 0);
    if (!id) return notFound("Nenhum veículo informado");
    const pre = window.__VEICULO__;
    if (pre && pre.id === id) return render(pre, [], window.__SEMELHANTES__ || []);
    try {
      const data = await A.loadAll();
      const v = data.veiculos.find((x) => x.id === id);
      if (!v) return notFound();
      render(v, data.veiculos);
    } catch (err) { notFound("Não foi possível carregar o veículo"); }
  });
})();
