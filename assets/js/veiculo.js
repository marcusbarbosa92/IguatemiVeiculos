/* veiculo.js — página de detalhes */
(function () {
  "use strict";
  const A = window.App, S = window.STORE, $ = A.$, $$ = A.$$, esc = A.esc, icon = A.icon;
  const TAG_STYLE = { "Blindado": "red", "Único Dono": "soft", "7 lugares": "soft", "Garantia de Fábrica": "soft" };

  function notFound(msg) {
    document.title = "Veículo não encontrado · " + S.nome;
    $("#vehicle").innerHTML = '<div class="container not-found">' + icon("car") + "<h1>" + esc(msg || "Veículo não encontrado") + "</h1><p class=\"muted\">Ele pode já ter sido vendido ou o link está incorreto. Veja o que temos disponível agora.</p><a class=\"btn btn-primary btn-lg\" href=\"estoque.html\">Ver estoque</a><a class=\"btn btn-wa\" href=\"" + A.waLink() + '" target="_blank" rel="noopener">' + icon("whatsapp") + " Falar no WhatsApp</a></div>";
    $("#sticky-cta").hidden = true; document.body.classList.remove("has-sticky-cta");
  }

  function render(v, all) {
    const name = A.vehName(v), wa = A.waLink(A.waVehicleMsg(v));
    document.title = name + " · " + A.fmtBRL(v.preco) + " · " + S.nome;
    const desc = name + " por " + A.fmtBRL(v.preco) + ". " + A.fmtKm(v.km) + ", " + v.cambio + ", " + v.combustivel + ". " + S.nome + ", Campinas - SP.";
    const setMeta = (sel, val) => { const m = document.querySelector(sel); if (m) m.setAttribute("content", val); };
    setMeta('meta[name="description"]', desc); setMeta('meta[property="og:title"]', name + " · " + A.fmtBRL(v.preco)); setMeta('meta[property="og:description"]', desc); setMeta('meta[property="og:image"]', v.capa);
    const canonical = A.absUrl(A.vehUrl(v));
    let link = document.querySelector('link[rel="canonical"]'); if (!link) { link = document.createElement("link"); link.rel = "canonical"; document.head.appendChild(link); } link.href = canonical;
    const tags = (v.caracteristicas || []).filter((c) => c in TAG_STYLE);
    const chars = (v.caracteristicas || []).filter((c) => !(c in TAG_STYLE));

    $("#vehicle").innerHTML =
      '<div class="container v-layout"><div class="v-main">' +
      '<div class="gallery" id="gallery"><div class="track" id="g-track">' + v.fotos.map((f, i) => '<button type="button" data-i="' + i + '" aria-label="Abrir foto ' + (i + 1) + ' em tela cheia"><img src="' + esc(f) + '" alt="' + esc(name) + " — foto " + (i + 1) + '" loading="' + (i < 2 ? "eager" : "lazy") + '" decoding="async"' + (i === 0 ? ' fetchpriority="high"' : "") + "></button>").join("") + "</div>" +
      '<button class="g-nav prev" type="button" id="g-prev" aria-label="Foto anterior">' + icon("chevL") + '</button><button class="g-nav next" type="button" id="g-next" aria-label="Próxima foto">' + icon("chevR") + "</button>" +
      '<div class="counter" id="g-counter">1/' + v.fotos.length + "</div></div>" +
      '<div class="thumbs" id="thumbs">' + v.fotos.map((f, i) => '<button type="button" data-i="' + i + '"' + (i === 0 ? ' class="on"' : "") + ' aria-label="Ver foto ' + (i + 1) + '"><img src="' + esc(f) + '" alt="" loading="lazy" decoding="async"></button>').join("") + "</div>" +
      '<div class="v-head"><nav class="breadcrumb" aria-label="Você está em"><a href="estoque.html">Estoque</a><span>›</span><a href="estoque.html?marca=' + encodeURIComponent(v.marca) + '">' + esc(A.titleCase(v.marca)) + '</a><span>›</span><a href="estoque.html?marca=' + encodeURIComponent(v.marca) + "&modelo=" + encodeURIComponent(v.modelo) + '">' + esc(v.modelo) + "</a></nav>" +
      "<h1><small>" + esc(v.marca) + " </small>" + esc(v.modelo) + "</h1>" + (v.versao ? '<div class="version">' + esc(v.versao) + "</div>" : "") +
      '<div class="tags">' + tags.map((t) => '<span class="badge ' + TAG_STYLE[t] + '">' + esc(t) + "</span>").join("") + chars.map((t) => '<span class="badge gray">' + esc(t) + "</span>").join("") + "</div></div>" +
      '<div class="specs">' + [["calendar", "Ano", v.anoFabricacao + "/" + v.anoModelo], ["gauge", "Km", A.fmtNum(v.km)], ["gear", "Câmbio", v.cambio], ["fuel", "Combustível", v.combustivel]].map((s) => '<div class="spec"><div class="fi">' + icon(s[0]) + "</div><div><span>" + s[1] + "</span><b>" + esc(s[2]) + "</b></div></div>").join("") + "</div>" +
      (v.opcionais && v.opcionais.length ? '<section class="block"><h2>Opcionais <span class="muted small">(' + v.opcionais.length + ')</span></h2><ul class="opt-grid' + (v.opcionais.length > 10 ? " collapsed" : "") + '" id="opt-list">' + v.opcionais.map((o) => "<li>" + icon("check") + esc(o) + "</li>").join("") + "</ul>" + (v.opcionais.length > 10 ? '<button class="expand" type="button" id="opt-toggle" aria-expanded="false">Ver todos os opcionais ' + icon("chevD") + "</button>" : "") + "</section>" : "") +
      (v.descricao && v.descricao.length ? '<section class="block desc"><h2>Informações do veículo</h2>' + v.descricao.map((p) => "<p>" + esc(p) + "</p>").join("") + "</section>" : "") +
      (v.video ? '<section class="block"><h2>Vídeo</h2><div class="yt" id="yt"><img src="https://i.ytimg.com/vi/' + esc(v.video) + '/hqdefault.jpg" alt="Vídeo do ' + esc(A.vehShort(v)) + '" loading="lazy"><button class="play" type="button" id="yt-play" aria-label="Reproduzir vídeo"><span>' + icon("play") + "</span></button></div></section>" : "") +
      '<p class="small muted" style="margin-top:14px">Anúncio nº ' + v.id + ". " + esc(S.avisoLegal) + "</p>" +
      "</div>" +
      '<aside class="v-side">' +
      '<div class="price-box"><div><div class="p"><small>R$</small>' + A.fmtBRL(v.preco).replace(/^R\$\s?/, "") + '</div><div class="lbl">Valor do veículo</div></div><button class="btn btn-icon btn-outline" type="button" id="btn-share" aria-label="Compartilhar">' + icon("share") + "</button></div>" +
      '<div class="cta-row"><a class="btn btn-wa btn-lg" href="' + wa + '" target="_blank" rel="noopener">' + icon("whatsapp") + ' Tenho interesse</a><a class="btn btn-dark btn-lg" href="' + A.telLink + '">' + icon("phone") + " Ligar agora</a>" +
      '<div class="row2"><button class="btn btn-outline" type="button" id="btn-sim">' + icon("calc") + ' Simular financiamento</button><a class="btn btn-outline" href="venda-seu-veiculo.html">' + icon("tag") + " Vender meu carro</a></div></div>" +
      '<section class="block"><h2>Compra segura</h2><ul class="opt-grid" style="grid-template-columns:1fr">' + S.garantias.filter((g) => !/garantia/i.test(g.titulo)).map((g) => "<li>" + icon("shield") + "<span><b>" + esc(g.titulo) + "</b><br>" + esc(g.texto) + "</span></li>").join("") + "</ul></section>" +
      "</aside></div>";

    $("#sticky-cta").hidden = false;
    $("#sticky-cta").innerHTML = '<div class="sp"><b>' + A.fmtBRL(v.preco) + "</b><span>" + esc(A.vehShort(v)) + '</span></div><a class="btn btn-icon btn-dark" href="' + A.telLink + '" aria-label="Ligar">' + icon("phone") + '</a><a class="btn btn-wa" href="' + wa + '" target="_blank" rel="noopener">' + icon("whatsapp") + " WhatsApp</a>";

    /* galeria */
    const track = $("#g-track"), n = v.fotos.length;
    let idx = 0;
    const goTo = (i, smooth) => { i = (i + n) % n; track.scrollTo({ left: i * track.clientWidth, behavior: smooth === false ? "auto" : "smooth" }); };
    track.addEventListener("scroll", () => { const i = Math.round(track.scrollLeft / track.clientWidth); if (i !== idx) { idx = i; $("#g-counter").textContent = (idx + 1) + "/" + n; $$("#thumbs button").forEach((b, k) => b.classList.toggle("on", k === idx)); const tb = $$("#thumbs button")[idx]; if (tb) tb.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" }); } }, { passive: true });
    $("#g-prev").addEventListener("click", () => goTo(idx - 1)); $("#g-next").addEventListener("click", () => goTo(idx + 1));
    $$("#thumbs button").forEach((b) => b.addEventListener("click", () => goTo(+b.dataset.i)));
    $$("#g-track > button").forEach((b) => b.addEventListener("click", () => openLightbox(+b.dataset.i)));
    document.addEventListener("keydown", (e) => { if ($("#lightbox").classList.contains("open") || $(".sheet.open") || (e.target && e.target.matches && e.target.matches("input, select, textarea"))) return; if (e.key === "ArrowLeft") goTo(idx - 1); if (e.key === "ArrowRight") goTo(idx + 1); });

    /* lightbox */
    const lb = $("#lightbox"), lbTrack = $("#lb-track");
    lbTrack.innerHTML = v.fotos.map((f, i) => '<div><img src="' + esc(f) + '" alt="' + esc(name) + " — foto " + (i + 1) + '" loading="lazy" decoding="async"></div>').join("");
    let lbIdx = 0;
    function openLightbox(i) { lb.classList.add("open"); lb.setAttribute("aria-hidden", "false"); document.body.style.overflow = "hidden"; requestAnimationFrame(() => { lbTrack.scrollTo({ left: i * lbTrack.clientWidth, behavior: "auto" }); lbIdx = i; $("#lb-counter").textContent = (i + 1) + "/" + n; }); $("#lb-close").focus(); }
    function closeLightbox() { lb.classList.remove("open"); lb.setAttribute("aria-hidden", "true"); document.body.style.overflow = ""; goTo(lbIdx, false); }
    const lbGo = (i) => { i = (i + n) % n; lbTrack.scrollTo({ left: i * lbTrack.clientWidth, behavior: "smooth" }); };
    lbTrack.addEventListener("scroll", () => { const i = Math.round(lbTrack.scrollLeft / lbTrack.clientWidth); if (i !== lbIdx) { lbIdx = i; $("#lb-counter").textContent = (i + 1) + "/" + n; } }, { passive: true });
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
      else { try { await navigator.clipboard.writeText(url); A.toast("Link copiado!"); } catch (e) { A.toast(url); } }
    });

    /* simulação */
    const sim = A.sheet("sim");
    $("#sim-veiculo").value = name; $("#sim-valor").value = A.fmtBRL(v.preco);
    $("#btn-sim").addEventListener("click", () => sim.open());
    const ent = $("#sim-entrada");
    ent.addEventListener("input", () => { const d = ent.value.replace(/\D/g, ""); ent.value = d ? A.fmtNum(+d) : ""; });

    /* semelhantes */
    let sim1 = all.filter((x) => x.id !== v.id && x.modelo === v.modelo && x.marca === v.marca);
    if (sim1.length < 4) sim1 = sim1.concat(all.filter((x) => x.id !== v.id && x.marca === v.marca && x.modelo !== v.modelo && x.tipo === v.tipo));
    if (sim1.length < 4) sim1 = sim1.concat(all.filter((x) => x.id !== v.id && x.tipo === v.tipo && !sim1.includes(x) && Math.abs(x.preco - v.preco) / v.preco <= 0.2).sort((a, b) => Math.abs(a.preco - v.preco) - Math.abs(b.preco - v.preco)));
    sim1 = sim1.slice(0, 6);
    if (sim1.length) { $("#similar-wrap").hidden = false; $("#similar").innerHTML = sim1.map((x) => A.vehicleCard({ ...x, nFotos: x.fotos ? x.fotos.length : x.nFotos })).join(""); }

    /* nota do Google, se preenchida em data/avaliacoes.json */
    A.loadReviews().then((d) => { if (!d) return; const blk = $(".v-side .block"); if (blk) blk.insertAdjacentHTML("beforeend", '<div style="margin-top:12px">' + A.googleBadge(d) + "</div>"); });

    /* JSON-LD */
    const ld = {
      "@context": "https://schema.org", "@type": v.tipo === "moto" ? "Motorcycle" : "Car", name: name, brand: { "@type": "Brand", name: v.marca }, model: v.modelo,
      vehicleConfiguration: v.versao || undefined, productionDate: String(v.anoFabricacao), vehicleModelDate: String(v.anoModelo),
      mileageFromOdometer: { "@type": "QuantitativeValue", value: v.km, unitCode: "KMT" }, vehicleTransmission: v.cambio, fuelType: v.combustivel,
      image: v.fotos.slice(0, 5), url: canonical, sku: String(v.id), itemCondition: "https://schema.org/UsedCondition",
      offers: { "@type": "Offer", price: v.preco, priceCurrency: "BRL", availability: "https://schema.org/InStock", url: canonical, seller: { "@type": "AutoDealer", name: S.nome, telephone: S.telefone.e164 } }
    };
    if (!document.querySelector('script[type="application/ld+json"]')) { const s = document.createElement("script"); s.type = "application/ld+json"; s.textContent = JSON.stringify(ld); document.head.appendChild(s); }
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const id = +(document.body.dataset.vehicleId || new URLSearchParams(location.search).get("id") || 0);
    if (!id) return notFound("Nenhum veículo informado");
    try {
      const data = await A.loadAll();
      const v = data.veiculos.find((x) => x.id === id);
      if (!v) return notFound();
      render(v, data.veiculos);
    } catch (err) { notFound("Não foi possível carregar o veículo"); }
  });
})();
