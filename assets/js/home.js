/* home.js — página inicial */
(function () {
  "use strict";
  const A = window.App, S = window.STORE, $ = A.$, esc = A.esc, icon = A.icon;
  const PRICES = [30000, 50000, 75000, 100000, 150000, 200000, 300000, 500000, 700000];

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

  function setupSearch(list) {
    const byBrand = {};
    list.forEach((v) => { (byBrand[v.marca] = byBrand[v.marca] || []).push(v); });
    const marcas = Object.keys(byBrand).sort();
    const mSel = $("#hs-marca"), moSel = $("#hs-modelo"), pSel = $("#hs-precoMax"), aSel = $("#hs-anoMin");
    marcas.forEach((m) => { const o = document.createElement("option"); o.value = m; o.textContent = A.titleCase(m) + " (" + byBrand[m].length + ")"; mSel.appendChild(o); });
    const fillModels = () => {
      moSel.innerHTML = '<option value="">Todos</option>';
      const src = mSel.value ? byBrand[mSel.value] : list;
      const cnt = {};
      src.forEach((v) => { cnt[v.modelo] = (cnt[v.modelo] || 0) + 1; });
      Object.keys(cnt).sort().forEach((m) => { const o = document.createElement("option"); o.value = m; o.textContent = m + " (" + cnt[m] + ")"; moSel.appendChild(o); });
    };
    mSel.addEventListener("change", fillModels); fillModels();
    PRICES.forEach((p) => { const o = document.createElement("option"); o.value = p; o.textContent = A.fmtBRL(p); pSel.appendChild(o); });
    const anos = Array.from(new Set(list.map((v) => v.anoModelo))).sort((a, b) => b - a);
    anos.forEach((y) => { const o = document.createElement("option"); o.value = y; o.textContent = y; aSel.appendChild(o); });
    $("#home-search").addEventListener("submit", (e) => {
      // remove campos vazios da URL
      e.preventDefault();
      const p = new URLSearchParams();
      ["marca", "modelo", "precoMax", "anoMin"].forEach((k) => { const el = $("#hs-" + k); if (el.value) p.set(k, el.value); });
      location.href = "estoque.html" + (p.toString() ? "?" + p.toString() : "");
    });
  }

  function setupChips(list) {
    const year = new Date().getFullYear();
    const defs = [
      ["Carros", (v) => v.tipo === "carro", "tipo=carro", "car"],
      ["Motos", (v) => v.tipo === "moto", "tipo=moto", null],
      ["0 km", (v) => v.km < 1000 && v.anoModelo >= year, "km=0", null],
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
    const cnt = {};
    list.forEach((v) => { cnt[v.marca] = (cnt[v.marca] || 0) + 1; });
    const marcas = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a] || a.localeCompare(b));
    $("#brands").innerHTML = marcas.map((m) => '<a class="brand-tile" href="estoque.html?marca=' + encodeURIComponent(m) + '">' + esc(A.titleCase(m)) + '<span class="n">' + cnt[m] + "</span></a>").join("");
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

  document.addEventListener("DOMContentLoaded", async () => {
    setupStore();
    try {
      const data = await A.loadIndex();
      const list = data.veiculos;
      const marcas = new Set(list.map((v) => v.marca));
      $("#hero-stats").innerHTML = "<div><b>" + list.length + "</b><span>veículos</span></div><div><b>" + marcas.size + "</b><span>marcas</span></div><div><b>100%</b><span>laudo aprovado</span></div>";
      setupSearch(list); setupChips(list); setupBrands(list);
      const nov = list.slice().sort((a, b) => b.id - a.id).slice(0, 8);
      $("#novidades").innerHTML = nov.map((v, i) => A.vehicleCard(v, { eager: i < 2 })).join("");
      jsonLd(list);
    } catch (err) {
      $("#novidades").innerHTML = '<div class="empty" style="grid-column:1/-1">' + icon("info") + "<b>Não foi possível carregar o estoque agora.</b><span>" + esc(err.message) + '</span><a class="btn btn-wa" href="' + A.waLink() + '" target="_blank" rel="noopener">Falar no WhatsApp</a></div>';
    }
  });
})();
