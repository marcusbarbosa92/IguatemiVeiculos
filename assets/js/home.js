/* home.js — página inicial */
(function () {
  "use strict";
  const A = window.App, S = window.STORE, $ = A.$, esc = A.esc, icon = A.icon;

  function setupStore() {
    const e = S.endereco, st = A.openStatus();
    $("#map-iframe").src = S.links.mapaEmbed;
    $("#link-maps").href = S.links.googleMaps;
    $("#link-waze").href = S.links.waze;
    $("#store-info").innerHTML =
      '<div class="info-row"><div class="fi">' + icon("pin") + "</div><div><b>" + esc(e.logradouro + ", " + e.numero) + "</b><span>" + esc(e.bairro + " · " + e.cidade + " - " + e.uf + " · CEP " + e.cep) + "</span></div></div>" +
      '<div class="info-row"><div class="fi">' + icon("clock") + "</div><div><b>Horário de atendimento <span class=\"open-now" + (st.open ? "" : " closed") + '">' + esc(st.label) + "</span></b><span>" + S.horario.map((h) => esc(h.dias) + ": " + esc(h.horas)).join("<br>") + "</span></div></div>" +
      '<div class="info-row"><div class="fi">' + icon("phone") + '</div><div><b><a href="' + A.telLink + '">' + esc(S.telefone.exibicao) + '</a></b><span>WhatsApp <a href="' + A.waLink() + '" target="_blank" rel="noopener">' + esc(S.whatsapp.exibicao) + "</a></span></div></div>" +
      '<a class="btn btn-wa btn-block" href="' + A.waLink() + '" target="_blank" rel="noopener">' + icon("whatsapp") + " Falar com um consultor</a>";
    $("#features").innerHTML = S.garantias.map((g, i) => '<div class="feature"><div class="fi">' + icon(["shield", "doc", "star", "lock"][i] || "check") + "</div><div><h3>" + esc(g.titulo) + "</h3><p>" + esc(g.texto) + "</p></div></div>").join("");
  }

  function setupSearch() {
    // busca simples: manda para o estoque com ?q= (o filtro completo fica lá); sem texto, abre o estoque inteiro
    const f = $("#quick-search");
    f.addEventListener("submit", (e) => {
      e.preventDefault();
      const q = f.elements.q.value.trim();
      location.href = "estoque.html" + (q ? "?q=" + encodeURIComponent(q) : "");
    });
  }

  function setupChips(list) {
    const defs = [
      ["SUVs", (v) => v.categoria === "suv", "categoria=suv", "car"],
      ["Picapes", (v) => v.categoria === "picape", "categoria=picape", null],
      ["Sedans", (v) => v.categoria === "sedan", "categoria=sedan", null],
      ["Hatches", (v) => v.categoria === "hatch", "categoria=hatch", null],
      ["Motos", (v) => v.tipo === "moto", "tipo=moto", null],
      ["Até 15 mil km", (v) => v.km <= 15000, "kmMax=15000", "gauge"],
      ["Blindados", (v) => v.caracteristicas.includes("Blindado"), "tag=Blindado", "shield"],
      ["7 lugares", (v) => v.caracteristicas.includes("7 lugares"), "tag=7%20lugares", "users"],
      ["Único dono", (v) => v.caracteristicas.includes("Único Dono"), "tag=%C3%9Anico%20Dono", "key"],
      ["Garantia de fábrica", (v) => v.caracteristicas.includes("Garantia de Fábrica"), "tag=Garantia%20de%20F%C3%A1brica", "star"],
      ["Até R$ 100 mil", (v) => v.preco <= 100000, "precoMax=100000", "money"],
      ["Diesel", (v) => v.combustivel === "Diesel", "combustivel=Diesel", "fuel"],
      ["Híbridos e elétricos", (v) => /el[eé]trico/i.test(v.combustivel), "combustivel=Gasolina%20e%20El%C3%A9trico&combustivel=El%C3%A9trico", null],
      ["Manual", (v) => v.cambio === "Manual", "cambio=Manual", "gear"]
    ];
    $("#quick-chips").innerHTML = defs.map((d) => { const n = list.filter(d[1]).length; return n ? '<a class="chip" href="estoque.html?' + d[2] + '">' + (d[3] ? icon(d[3]) : "") + esc(d[0]) + '<span class="n">' + n + "</span></a>" : ""; }).join("");
  }

  function setupBrands(list) {
    const cnt = {}, soMoto = {};
    list.forEach((v) => { cnt[v.marca] = (cnt[v.marca] || 0) + 1; soMoto[v.marca] = (soMoto[v.marca] !== false) && v.tipo === "moto"; });
    const marcas = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a] || a.localeCompare(b));
    const grid = $("#brands");
    grid.innerHTML = marcas.map((m) => '<a class="brand-tile" href="estoque.html?marca=' + encodeURIComponent(m) + '"><img src="' + A.brandLogo(m, soMoto[m] ? "moto" : "carro") + '" alt="" width="40" height="40" loading="lazy"><span class="name">' + esc(A.titleCase(m)) + '</span><span class="n">' + cnt[m] + "</span></a>").join("");
    if (marcas.length > 10 && window.matchMedia("(max-width: 899px)").matches) {
      grid.classList.add("collapsed");
      grid.insertAdjacentHTML("afterend", '<div class="brands-more"><button class="btn btn-outline btn-sm" type="button" id="brands-more" aria-expanded="false" aria-controls="brands">Ver todas as ' + marcas.length + " marcas</button></div>");
      $("#brands-more").addEventListener("click", () => { const c = grid.classList.toggle("collapsed"); $("#brands-more").setAttribute("aria-expanded", c ? "false" : "true"); $("#brands-more").textContent = c ? "Ver todas as " + marcas.length + " marcas" : "Mostrar menos"; });
    }
  }

  function jsonLd(list) {
    const e = S.endereco;
    const data = {
      "@context": "https://schema.org", "@type": "AutoDealer", name: S.nome, legalName: S.razaoSocial, taxID: S.cnpj,
      url: location.origin + location.pathname, telephone: S.telefone.e164, email: S.email, image: A.absUrl("assets/img/og.png"), logo: A.absUrl("assets/img/logo.png"),
      address: { "@type": "PostalAddress", streetAddress: e.logradouro + ", " + e.numero, addressLocality: e.cidade, addressRegion: e.uf, postalCode: e.cep, addressCountry: "BR" },
      geo: { "@type": "GeoCoordinates", latitude: e.lat, longitude: e.lng },
      openingHoursSpecification: S.horario.map((h) => ({ "@type": "OpeningHoursSpecification", dayOfWeek: h.diasSemana.map((d) => ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][d]), opens: h.abre, closes: h.fecha })),
      sameAs: [S.links.instagram, S.links.facebook, S.links.youtube, S.links.tiktok]
    };
    const s = document.createElement("script"); s.type = "application/ld+json"; s.textContent = JSON.stringify(data); document.head.appendChild(s);
  }

  async function setupReviews() {
    const d = await A.loadReviews();
    if (!d) return;
    $("#rating-card").innerHTML = '<div class="big">' + A.fmtNota(d.nota) + '</div><div class="meta">' + A.stars(d.nota) + "<span>" + (d.totalAvaliacoes ? A.fmtNum(d.totalAvaliacoes) + " avaliações no Google" : "Avaliações no Google") + (d.atualizadoEm ? " · em " + esc(d.atualizadoEm.split("-").reverse().join("/")) : "") + '</span><a href="' + esc(d.linkGoogle) + '" target="_blank" rel="noopener">Ver todas no Google →</a></div>';
    const list = (d.avaliacoes || []).filter((r) => r && r.texto && r.nome);
    $("#avaliacoes").innerHTML = list.map((r) => '<article class="review-card">' + A.stars(r.estrelas || 5) + "<blockquote>“" + esc(r.texto) + "”</blockquote><footer><b>" + esc(r.nome) + "</b>" + (r.data ? " · " + esc(r.data) : "") + " · Google</footer></article>").join("");
    $("#avaliacoes").hidden = !list.length;
    $("#avaliacoes-section").hidden = false;
  }
  function setupVideo() {
    const v = $("#hero-video"); if (!v) return;
    const c = navigator.connection || {};
    const slow = c.saveData || /(^|[^a-z])2g/.test(c.effectiveType || "");
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const desktop = window.matchMedia && window.matchMedia("(min-width: 900px)").matches; // no desktop o vídeo vertical vira mancha: fica o poster paisagem
    if (slow || reduce || desktop) { v.removeAttribute("autoplay"); v.querySelectorAll("source").forEach((s) => s.remove()); v.load(); v.remove(); return; }
    const p = v.play && v.play(); if (p && p.catch) p.catch(() => { /* autoplay bloqueado: fica o poster */ });
  }

  document.addEventListener("DOMContentLoaded", async () => {
    setupStore();
    setupVideo();
    setupReviews();
    try {
      const data = await A.loadIndex();
      const list = data.veiculos;
      setupSearch(); setupChips(list); setupBrands(list);
      // "Últimas novidades" = destaques da home da loja (ordem definida por ela, capturada pelo sync)
      const byId = new Map(list.map((v) => [v.id, v]));
      const nov = (data.destaques || []).map((id) => byId.get(id)).filter(Boolean).slice(0, 8);
      if (nov.length) $("#novidades").innerHTML = nov.map((v, i) => A.vehicleCard(v, { eager: i < 2 })).join("");
      else $("#novidades").closest("section").hidden = true;
      if (!document.querySelector('script[type="application/ld+json"]')) jsonLd(list); // a ficha estática já vem no HTML (gerar-paginas.mjs)
    } catch (err) {
      $("#novidades").innerHTML = '<div class="empty" style="grid-column:1/-1">' + icon("info") + "<b>Não foi possível carregar o estoque agora.</b><span>" + esc(err.message) + '</span><a class="btn btn-wa" href="' + A.waLink() + '" target="_blank" rel="noopener">Falar no WhatsApp</a></div>';
    }
  });
})();
