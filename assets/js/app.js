/* app.js — utilidades compartilhadas, chrome (cabeçalho, gaveta, barra inferior, rodapé) e cartões de veículo. */
(function () {
  "use strict";
  const S = window.STORE;
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  /* ---------- Ícones (SVG inline, traço 2px) ---------- */
  const ICONS = {
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
    whatsapp: '<path class="ic-fill" d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.87 9.87 0 0 0 4.74 1.21c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2m0 1.67c4.56 0 8.24 3.7 8.24 8.24s-3.68 8.24-8.24 8.24c-1.5 0-2.97-.4-4.24-1.17l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.36c0-4.54 3.7-8.24 8.29-8.24M8.53 7.33c-.16 0-.43.06-.66.31-.22.25-.87.86-.87 2.07 0 1.22.89 2.39 1 2.56.14.17 1.76 2.67 4.25 3.73.59.27 1.05.42 1.41.53.59.19 1.13.16 1.56.1.48-.07 1.46-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.07-.1-.23-.16-.48-.27-.25-.14-1.47-.74-1.69-.82-.23-.08-.37-.12-.56.12-.16.25-.64.81-.78.97-.15.17-.29.19-.53.07-.26-.13-1.06-.39-2-1.23-.74-.66-1.23-1.47-1.38-1.72-.12-.24-.01-.39.11-.5.11-.11.27-.29.37-.44.13-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.11-.56-1.35-.77-1.84-.2-.48-.4-.42-.56-.43-.14 0-.3-.01-.47-.01"/>',
    home: '<path d="M3 11l9-8 9 8v9a2 2 0 0 1-2 2h-4v-6h-6v6H5a2 2 0 0 1-2-2z"/>',
    car: '<path d="M5 17h14M6 11l1.6-4.4A2 2 0 0 1 9.5 5h5a2 2 0 0 1 1.9 1.6L18 11M3 13a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4H3z"/><circle cx="7.5" cy="17" r="1.5"/><circle cx="16.5" cy="17" r="1.5"/>',
    tag: '<path d="M20 12l-8 8-9-9V4h7l10 8z"/><circle cx="8" cy="8" r="1.5"/>',
    pin: '<path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
    sort: '<path d="M4 7h10M4 12h7M4 17h4M17 6v12m0 0 3-3m-3 3-3-3"/>',
    chevL: '<path d="m15 6-6 6 6 6"/>',
    chevR: '<path d="m9 6 6 6-6 6"/>',
    chevD: '<path d="m6 9 6 6 6-6"/>',
    share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    gauge: '<path d="M4 15a8 8 0 1 1 16 0"/><path d="m12 15 4-5"/><circle cx="12" cy="15" r="1.5"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    fuel: '<path d="M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M3 21h12M14 9h2a2 2 0 0 1 2 2v6a1.5 1.5 0 0 0 3 0V9l-3-3"/><rect x="7" y="6" width="4" height="4" rx=".5"/>',
    check: '<path d="m5 12 5 5 9-10"/>',
    instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" class="ic-fill"/>',
    facebook: '<path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8z"/>',
    youtube: '<path d="M22 12s0-4-.5-5.5A3 3 0 0 0 19.4 4.4C17.9 4 12 4 12 4s-5.9 0-7.4.4A3 3 0 0 0 2.5 6.5C2 8 2 12 2 12s0 4 .5 5.5a3 3 0 0 0 2.1 2.1C6.1 20 12 20 12 20s5.9 0 7.4-.4a3 3 0 0 0 2.1-2.1C22 16 22 12 22 12z"/><path d="m10 9 5 3-5 3z" class="ic-fill"/>',
    tiktok: '<path d="M9 12a4 4 0 1 0 4 4V4c.5 2.5 2.2 4 5 4"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    play: '<path d="M6 4v16l14-8z" class="ic-fill"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="m21 16-5-5-8 8"/>',
    arrowR: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
    shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
    doc: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
    lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z"/>',
    calc: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 12h2M12 12h2M16 12h0M8 16h2M12 16h2M16 16h0"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h0"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    money: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M7 12h0M17 12h0"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-4.5-6.2"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9m-3 3 2 2m-5 1 2 2"/>',
    heart: '<path d="M12 20.5s-7.5-4.6-9.3-9.1C1.5 8.3 3.6 4.9 7 4.9c2 0 3.4 1.1 5 2.8 1.6-1.7 3-2.8 5-2.8 3.4 0 5.5 3.4 4.3 6.5-1.8 4.5-9.3 9.1-9.3 9.1z"/>'
  };
  const icon = (name, cls) => '<svg class="ic ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[name] || '') + '</svg>';

  /* ---------- Formatação ---------- */
  const fmtBRL = (n) => {
    const hasCents = Math.round(n * 100) % 100 !== 0;
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: hasCents ? 2 : 0, maximumFractionDigits: hasCents ? 2 : 0 }).format(n);
  };
  const fmtNum = (n) => new Intl.NumberFormat("pt-BR").format(n);
  const fmtKm = (n) => fmtNum(n) + " km";
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const SIGLAS = new Set(["BMW", "BYD", "GWM", "RAM", "MINI", "JAC", "GM"]);
  const titleCase = (s) => String(s).split(/(\s+|-)/).map((w) => (SIGLAS.has(w.toUpperCase()) ? w.toUpperCase() : w.toLowerCase().replace(/^([a-zà-ú])/, (c) => c.toUpperCase()))).join("");
  const vehName = (v) => v.marca + " " + v.modelo + (v.versao ? " " + v.versao : "") + " " + v.anoFabricacao + "/" + v.anoModelo;
  const vehShort = (v) => v.marca + " " + v.modelo + " " + v.anoFabricacao + "/" + v.anoModelo;
  const vehUrl = (v) => "v/" + v.id + ".html";
  const fotoId = (url) => String(url || "").split("/").pop().replace(/\.[a-z0-9]+$/i, "").replace(/[^A-Za-z0-9_-]/g, "");
  const thumbUrl = (v) => "assets/thumbs/" + v.id + "-" + (v.capaId || fotoId(v.capa)) + ".webp"; // capa em 800 px (scripts/gerar-miniaturas.py; fallback: v.capa)
  const fotoThumbUrl = (v, url) => "assets/fotos/" + v.id + "/" + fotoId(url) + ".webp";           // foto em 160 px para a faixa de miniaturas
  const brandKey = (marca, tipo) => String(marca).toLowerCase().replace(/[^a-z0-9]/g, "") + (tipo === "moto" ? "_moto" : "");
  const brandLogo = (marca, tipo) => "assets/marcas/" + brandKey(marca, tipo) + ".webp";
  const absUrl = (rel) => new URL(rel, document.baseURI).href;

  /* ---------- WhatsApp / telefone ---------- */
  // Sem mensagem explícita, usa a da página (<body data-wa-msg>, ex.: "quero vender", "estou vendo SUVs até 100 mil") ou a padrão da loja
  const waLink = (msg) => "https://wa.me/" + S.whatsapp.numero + "?text=" + encodeURIComponent(msg || document.body.dataset.waMsg || S.whatsapp.mensagemPadrao);
  const waVehicleMsg = (v) => "Olá! Tenho interesse no " + vehName(v) + " (" + fmtBRL(v.preco) + ") que vi no site. Ainda está disponível?\n" + absUrl(vehUrl(v));
  // Troca a mensagem genérica dos links do cabeçalho, gaveta, barra inferior e rodapé (páginas em que o contexto muda depois do carregamento, como o estoque com filtros)
  function setWaMsg(msg) { if (msg) document.body.dataset.waMsg = msg; else delete document.body.dataset.waMsg; $$("a[data-wa-generic]").forEach((a) => { a.href = waLink(); }); }
  const telLink = "tel:" + S.telefone.e164;

  /* ---------- Horário: aberto agora? ---------- */
  function openStatus(now) {
    now = now || new Date();
    // horário da loja (America/Sao_Paulo), independente do fuso do visitante
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", weekday: "short", hour: "numeric", minute: "numeric", hour12: false }).formatToParts(now);
    const get = (t) => (parts.find((p) => p.type === t) || {}).value;
    const d = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday")), mins = (+get("hour") % 24) * 60 + +get("minute");
    const toMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
    const hora = (t) => t.replace(/^0/, "").replace(":00", "h").replace(":", "h");
    for (const h of S.horario) {
      if (h.diasSemana.includes(d) && mins >= toMin(h.abre) && mins < toMin(h.fecha)) return { open: true, label: "Aberto agora · até " + hora(h.fecha), fecha: h.fecha };
    }
    // próxima abertura: hoje mais tarde, amanhã ou no próximo dia com expediente
    const DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
    for (let k = 0; k <= 7; k++) {
      const dia = (d + k) % 7;
      const hs = S.horario.filter((h) => h.diasSemana.includes(dia)).sort((a, b) => toMin(a.abre) - toMin(b.abre));
      for (const h of hs) {
        if (k === 0 && mins >= toMin(h.abre)) continue;
        const quando = k === 0 ? "hoje" : k === 1 ? "amanhã" : DIAS[dia];
        return { open: false, label: "Fechado agora", proxima: "abre " + quando + " às " + hora(h.abre), proximaDia: dia, proximaHora: h.abre };
      }
    }
    return { open: false, label: "Fechado agora" };
  }

  /* ---------- Dados ---------- */
  const cache = {};
  async function loadJSON(path) {
    if (cache[path]) return cache[path];
    const p = fetch(path, { cache: "no-cache" }).then((r) => { if (!r.ok) throw new Error("HTTP " + r.status + " em " + path); return r.json(); });
    cache[path] = p;
    return p;
  }
  // categorias de carroceria (data/categorias.json), anexadas a cada veículo como v.categoria
  let catPromise = null;
  const loadCats = () => (catPromise = catPromise || loadJSON("data/categorias.json").catch(() => ({ categorias: {}, modelos: {} })));
  const withCats = (doc) => loadCats().then((c) => { doc.categorias = c.categorias || {}; (doc.veiculos || []).forEach((v) => { v.categoria = v.tipo === "moto" ? "moto" : (c.modelos || {})[v.marca + "|" + v.modelo] || null; }); return doc; });
  const loadIndex = () => loadJSON("data/index.json").then(withCats);
  const loadAll = () => loadJSON("data/vehicles.json").then(withCats);

  /* ---------- Cartão de veículo ---------- */
  const TAGS = { "Blindado": "red", "Único Dono": "", "7 lugares": "", "Garantia de Fábrica": "" };
  function vehicleCard(v, opts) {
    opts = opts || {};
    const tags = (v.caracteristicas || []).filter((c) => Object.prototype.hasOwnProperty.call(TAGS, c)).slice(0, 2);
    return '<article class="v-card">' +
      '<a class="card-link" href="' + vehUrl(v) + '" aria-label="' + esc(vehName(v)) + '"></a>' +
      '<div class="v-img"><img src="' + thumbUrl(v) + '" data-fallback="' + esc(v.capa) + '" alt="' + esc(vehName(v)) + '" loading="' + (opts.eager ? "eager" : "lazy") + '" decoding="async" width="640" height="480">' +
      '<div class="v-badges">' + tags.map((t) => '<span class="badge ' + (TAGS[t] || "") + '">' + esc(t) + "</span>").join("") + "</div>" +
      (v.nFotos ? '<span class="v-photos" aria-label="' + v.nFotos + ' fotos' + (v.video ? ' e vídeo' : '') + '">' + icon("image") + v.nFotos + (v.video ? '<span class="v-video">' + icon("play") + "</span>" : "") + "</span>" : "") + Fav.button(v.id, "fav-card") + "</div>" +
      '<div class="v-body">' +
      '<div class="v-brand">' + esc(v.marca) + "</div>" +
      '<div class="v-title">' + esc(v.modelo) + "</div>" +
      '<div class="v-version">' + esc(v.versao || (v.tipo === "moto" ? "Moto" : "")) + "</div>" +
      '<div class="v-meta">' +
      "<span>" + icon("calendar") + v.anoFabricacao + "/" + v.anoModelo + "</span>" +
      "<span>" + icon("gauge") + fmtKm(v.km) + "</span>" +
      "<span>" + icon("gear") + esc(v.cambio) + "</span>" +
      "<span>" + icon("fuel") + esc(v.combustivel) + "</span></div>" +
      '<div class="v-foot"><div class="v-price"><small>R$</small>' + fmtBRL(v.preco).replace(/^R\$\s?/, "") + "</div>" +
      '<div class="v-actions"><a class="btn btn-wa btn-sm" href="' + waLink(waVehicleMsg(v)) + '" target="_blank" rel="noopener" aria-label="Chamar no WhatsApp sobre ' + esc(vehShort(v)) + '">' + icon("whatsapp") + "</a>" +
      '<a class="btn btn-dark btn-sm" href="' + vehUrl(v) + '">Detalhes</a></div></div>' +
      "</div></article>";
  }

  /* ---------- Chrome: cabeçalho, gaveta, barra inferior, rodapé ---------- */
  const NAV = [
    ["index.html", "Início", "home"],
    ["estoque.html", "Estoque", "car"],
    ["venda-seu-veiculo.html", "Venda seu veículo", "tag"],
    ["financiamento.html", "Financiamento", "calc"],
    ["quem-somos.html", "Quem somos", "users"],
    ["contato.html", "Contato", "pin"]
  ];
  const currentPage = () => { const p = location.pathname.split("/").pop() || "index.html"; return p === "" ? "index.html" : p; };
  const cur = (href) => (currentPage() === href ? ' aria-current="page"' : "");

  function renderChrome() {
    const header = $("#site-header");
    if (header) {
      header.className = "site-header";
      header.innerHTML = '<div class="container">' +
        '<button class="hdr-btn menu" type="button" id="menu-open" aria-label="Abrir menu" aria-controls="drawer" aria-expanded="false">' + icon("menu") + "</button>" +
        '<a class="brand" href="index.html" aria-label="' + esc(S.nome) + ' — início"><img src="assets/img/logo.png" alt="' + esc(S.nome) + '" width="340" height="90"></a>' +
        '<nav class="top-nav" aria-label="Principal">' + NAV.map((n) => '<a href="' + n[0] + '"' + cur(n[0]) + ">" + n[1] + "</a>").join("") + "</nav>" +
        '<a class="hdr-btn phone" href="' + telLink + '" aria-label="Ligar para ' + esc(S.telefone.exibicao) + '">' + icon("phone") + "</a>" +
        '<a class="btn btn-wa hdr-wa" data-wa-generic href="' + waLink() + '" target="_blank" rel="noopener">' + icon("whatsapp") + " " + esc(S.whatsapp.exibicao) + "</a>" +
        "</div>";
      const skip = document.createElement("a"); skip.className = "skip-link"; skip.href = location.href.split("#")[0] + "#main"; /* com <base href="../"> nas páginas v/, "#main" iria para a home */ skip.textContent = "Pular para o conteúdo"; document.body.prepend(skip);
      const drawer = document.createElement("div");
      drawer.innerHTML = '<div class="drawer-backdrop" id="drawer-backdrop"></div>' +
        '<aside class="drawer" id="drawer" aria-label="Menu" aria-hidden="true" inert>' +
        '<div class="drawer-top"><img src="assets/img/logo.png" alt="' + esc(S.nome) + '"><button class="hdr-btn" type="button" id="menu-close" aria-label="Fechar menu">' + icon("close") + "</button></div>" +
        '<nav class="drawer-nav" aria-label="Menu principal">' + NAV.map((n) => '<a href="' + n[0] + '"' + cur(n[0]) + ">" + icon(n[2]) + n[1] + "</a>").join("") + "</nav>" +
        '<div class="drawer-contact">' +
        '<a class="btn btn-wa" data-wa-generic href="' + waLink() + '" target="_blank" rel="noopener">' + icon("whatsapp") + " WhatsApp " + esc(S.whatsapp.exibicao) + "</a>" +
        '<a class="btn btn-outline-light" href="' + telLink + '">' + icon("phone") + " " + esc(S.telefone.exibicao) + "</a>" +
        '<div class="drawer-hours"><strong>Horário</strong><br>' + S.horario.map((h) => esc(h.dias) + ": " + esc(h.horas)).join("<br>") + "</div>" +
        socialRow() + "</div></aside>";
      document.body.append(...drawer.childNodes);
      let untrapDrawer = null;
      const open = () => { const d = $("#drawer"); d.removeAttribute("inert"); d.classList.add("open"); $("#drawer-backdrop").classList.add("open"); d.setAttribute("aria-hidden", "false"); $("#menu-open").setAttribute("aria-expanded", "true"); document.body.style.overflow = "hidden"; $("#menu-close").focus(); untrapDrawer = trapFocus(d); };
      const close = () => { const d = $("#drawer"); if (!d.classList.contains("open")) return; d.classList.remove("open"); $("#drawer-backdrop").classList.remove("open"); d.setAttribute("aria-hidden", "true"); d.setAttribute("inert", ""); $("#menu-open").setAttribute("aria-expanded", "false"); document.body.style.overflow = ""; if (untrapDrawer) { untrapDrawer(); untrapDrawer = null; } $("#menu-open").focus(); };
      $("#menu-open").addEventListener("click", open);
      $("#menu-close").addEventListener("click", close);
      $("#drawer-backdrop").addEventListener("click", close);
      document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
      const mq = window.matchMedia("(min-width: 900px)");
      (mq.addEventListener ? mq.addEventListener("change", (e) => { if (e.matches) close(); }) : mq.addListener((e) => { if (e.matches) close(); }));
    }
    if (!document.body.classList.contains("no-bottom-nav")) {
      const bn = document.createElement("nav");
      bn.className = "bottom-nav"; bn.setAttribute("aria-label", "Navegação rápida");
      bn.innerHTML =
        '<a href="index.html"' + cur("index.html") + ">" + icon("home") + "<span>Início</span></a>" +
        '<a href="estoque.html"' + cur("estoque.html") + ">" + icon("car") + "<span>Estoque</span></a>" +
        '<a class="bn-wa" data-wa-generic href="' + waLink() + '" target="_blank" rel="noopener"><span class="bn-wa-circle">' + icon("whatsapp") + "</span><span>WhatsApp</span></a>" +
        '<a href="venda-seu-veiculo.html"' + cur("venda-seu-veiculo.html") + ">" + icon("tag") + "<span>Vender</span></a>" +
        '<a href="contato.html"' + cur("contato.html") + ">" + icon("pin") + "<span>Contato</span></a>";
      document.body.appendChild(bn);
    }
    const footer = $("#site-footer");
    if (footer) {
      footer.className = "site-footer";
      const e = S.endereco;
      footer.innerHTML = '<div class="container">' +
        '<div class="f-brand"><img src="assets/img/logo.png" alt="' + esc(S.nome) + '"><p>' + esc(S.slogan) + "</p>" + socialRow() + "</div>" +
        "<div><h2>Onde estamos</h2><ul class=\"f-list\">" +
        "<li>" + icon("pin") + '<a href="' + esc(S.links.googleMaps) + '" target="_blank" rel="noopener">' + esc(e.logradouro + ", " + e.numero) + "<br>" + esc(e.bairro + " · " + e.cidade + " - " + e.uf) + "<br>CEP " + esc(e.cep) + "</a></li>" +
        "<li>" + icon("clock") + "<span>" + S.horario.map((h) => esc(h.dias) + ": " + esc(h.horas)).join("<br>") + "</span></li>" +
        "</ul></div>" +
        "<div><h2>Fale conosco</h2><ul class=\"f-list\">" +
        "<li>" + icon("whatsapp") + '<a data-wa-generic href="' + waLink() + '" target="_blank" rel="noopener">WhatsApp ' + esc(S.whatsapp.exibicao) + "</a></li>" +
        "<li>" + icon("phone") + '<a href="' + telLink + '">' + esc(S.telefone.exibicao) + "</a></li>" +
        "<li>" + icon("mail") + '<a href="mailto:' + esc(S.email) + '">' + esc(S.email) + "</a></li>" +
        "</ul></div>" +
        '<div><h2>Navegação</h2><nav class="f-nav" aria-label="Rodapé">' + NAV.map((n) => '<a href="' + n[0] + '">' + n[1] + "</a>").join("") + '<a href="politica-de-privacidade.html">Política de privacidade</a></nav></div>' +
        '<div class="f-bottom"><span>© ' + new Date().getFullYear() + " " + esc(S.nome) + " · " + esc(S.razaoSocial) + " · CNPJ " + esc(S.cnpj) + "</span>" +
        "<span>" + esc(S.avisoLegal) + "</span></div>" +
        "</div>";
    }
  }
  function socialRow() {
    const L = S.links;
    return '<div class="social-row">' +
      '<a href="' + esc(L.instagram) + '" target="_blank" rel="noopener" aria-label="Instagram">' + icon("instagram") + "</a>" +
      '<a href="' + esc(L.facebook) + '" target="_blank" rel="noopener" aria-label="Facebook">' + icon("facebook") + "</a>" +
      '<a href="' + esc(L.youtube) + '" target="_blank" rel="noopener" aria-label="YouTube">' + icon("youtube") + "</a>" +
      '<a href="' + esc(L.tiktok) + '" target="_blank" rel="noopener" aria-label="TikTok">' + icon("tiktok") + "</a></div>";
  }

  /* ---------- Prende o foco (Tab) dentro de um diálogo aberto ---------- */
  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  function trapFocus(container) {
    const handler = (e) => {
      if (e.key !== "Tab") return;
      const items = $$(FOCUSABLE, container).filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || !container.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (document.activeElement === last || !container.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }

  /* ---------- Folha inferior (bottom sheet) genérica ---------- */
  function sheet(id, opts) {
    opts = opts || {};
    const el = $("#" + id), bd = $("#" + id + "-backdrop");
    if (!el || !bd) return null;
    el.setAttribute("inert", "");
    let lastFocus = null, untrap = null;
    const api = {
      open() { lastFocus = document.activeElement; el.removeAttribute("inert"); el.classList.add("open"); bd.classList.add("open"); el.setAttribute("aria-hidden", "false"); document.body.style.overflow = "hidden"; const f = el.querySelector("[data-autofocus]") || el.querySelector("button, input, select, [tabindex]"); if (f) f.focus({ preventScroll: true }); untrap = trapFocus(el); },
      close() { if (!el.classList.contains("open")) return; el.classList.remove("open"); bd.classList.remove("open"); el.setAttribute("aria-hidden", "true"); el.setAttribute("inert", ""); document.body.style.overflow = ""; if (untrap) { untrap(); untrap = null; } if (lastFocus && lastFocus.focus) lastFocus.focus(); if (opts.onClose) opts.onClose(); },
      isOpen() { return el.classList.contains("open"); }
    };
    bd.addEventListener("click", api.close);
    $$("[data-close]", el).forEach((b) => b.addEventListener("click", api.close));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && api.isOpen()) api.close(); });
    return api;
  }

  /* ---------- Favoritos (só no aparelho: localStorage) ---------- */
  const Fav = {
    key: "favoritos",
    get() { try { const a = JSON.parse(localStorage.getItem(this.key) || "[]"); return Array.isArray(a) ? a.map(Number).filter(Boolean) : []; } catch (e) { return []; } },
    has(id) { return this.get().includes(Number(id)); },
    toggle(id) {
      id = Number(id); let list = this.get(); const on = !list.includes(id);
      list = on ? list.concat(id) : list.filter((x) => x !== id);
      try { localStorage.setItem(this.key, JSON.stringify(list)); } catch (e) { /* sem storage */ }
      $$('[data-fav="' + id + '"]').forEach((b) => { b.setAttribute("aria-pressed", on ? "true" : "false"); b.setAttribute("aria-label", on ? "Remover dos salvos" : "Salvar veículo"); });
      document.dispatchEvent(new CustomEvent("fav:change", { detail: { id, on, total: list.length } }));
      toast(on ? "Salvo neste aparelho" : "Removido dos salvos");
      return on;
    },
    button(id, cls) { const on = this.has(id); return '<button class="fav ' + (cls || "") + '" type="button" data-fav="' + id + '" aria-pressed="' + (on ? "true" : "false") + '" aria-label="' + (on ? "Remover dos salvos" : "Salvar veículo") + '">' + icon("heart") + "</button>"; }
  };
  document.addEventListener("click", (e) => { const b = e.target && e.target.closest ? e.target.closest("[data-fav]") : null; if (!b) return; e.preventDefault(); e.stopPropagation(); Fav.toggle(b.dataset.fav); });

  /* Consentimento (LGPD): "all" libera medição e anúncios; "necessary" mantém só o essencial. Lido por analytics.js. */
  const Consent = {
    get() { try { const c = localStorage.getItem("consent"); if (c) return c; return localStorage.getItem("cookies-ok") === "1" ? "all" : null; } catch (e) { return null; } },
    set(v) { try { localStorage.setItem("consent", v); } catch (e) { /* sem storage */ } document.dispatchEvent(new CustomEvent("consent:change", { detail: v })); }
  };
  /* ---------- Avaliações do Google (data/avaliacoes.json, preenchido à mão) ---------- */
  const safeHttp = (u) => (/^https:\/\//i.test(String(u || "")) ? String(u) : "");
  const loadReviews = () => loadJSON("data/avaliacoes.json").then((d) => (d && typeof d.nota === "number" && d.nota > 0 && d.nota <= 5 ? Object.assign(d, { linkGoogle: safeHttp(d.linkGoogle) }) : null)).catch(() => null);
  const stars = (n) => '<span class="stars" role="img" aria-label="' + esc(Number(n) || 0) + ' de 5 estrelas">' + [1, 2, 3, 4, 5].map((i) => icon("star", i <= Math.round(n) ? "ic-fill" : "ic-fill off")).join("") + "</span>";
  const fmtNota = (n) => n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const googleBadge = (d) => '<a class="google-badge" href="' + esc(d.linkGoogle) + '" target="_blank" rel="noopener">' + stars(d.nota) + "<span>" + fmtNota(d.nota) + " no Google" + (d.totalExibicao || d.totalAvaliacoes ? " · " + esc(d.totalExibicao || fmtNum(d.totalAvaliacoes)) + " avaliações" : "") + "</span></a>";

  /* ---------- Toast ---------- */
  let toastTimer;
  function toast(msg) {
    let t = $(".toast");
    if (!t) { t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
    t.textContent = msg; t.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 2400);
  }

  /* ---------- Formulários → WhatsApp ---------- */
  function bindWaForms() {
    $$("form[data-wa-form]").forEach((form) => {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        if (!form.reportValidity()) return;
        const title = form.getAttribute("data-wa-form");
        const lines = ["*" + title + "*"];
        $$("[name]", form).forEach((f) => {
          if (f.type === "checkbox" && !f.checked) return;
          let val = f.type === "checkbox" ? "Sim" : f.value.trim();
          if (f.tagName === "SELECT" && f.selectedIndex >= 0) val = f.options[f.selectedIndex].text.trim();
          if (!val || f.dataset.skip === "1") return;
          const label = f.dataset.label || (form.querySelector('label[for="' + f.id + '"]') || {}).textContent || f.name;
          lines.push(label.replace(/[*:]+$/, "").trim() + ": " + val);
        });
        const texto = lines.join("\n"), href = waLink(texto);
        window.open(href, "_blank", "noopener");
        toast("Abrindo o WhatsApp…");
        // aba bloqueada ou WhatsApp Web sem login: o pedido não pode se perder; fica um link fixo, e-mail com o mesmo texto e telefone
        let alt = form.querySelector(".wa-alt");
        if (!alt) { alt = document.createElement("p"); alt.className = "wa-alt small"; alt.setAttribute("role", "status"); const btn = form.querySelector('[type="submit"]'); (btn && btn.parentElement === form ? btn : form).insertAdjacentElement(btn && btn.parentElement === form ? "afterend" : "beforeend", alt); }
        const mail = "mailto:" + S.email + "?subject=" + encodeURIComponent(title + " · site") + "&body=" + encodeURIComponent(texto.replace(/\*/g, ""));
        alt.innerHTML = 'Se o WhatsApp não abriu: <a href="' + href + '" target="_blank" rel="noopener">abrir de novo</a> · <a href="' + mail + '">enviar por e-mail</a> · <a href="' + telLink + '">ligar ' + esc(S.telefone.exibicao) + "</a>";
        const sh = form.closest(".sheet");
        if (sh) { const c = sh.querySelector("[data-close]"); if (c) c.click(); }
      });
    });
  }

  /* ---------- Máscara simples de telefone ---------- */
  function maskPhone(input) {
    input.addEventListener("input", () => {
      // quantos dígitos existem antes do cursor, para devolvê-lo ao mesmo lugar depois de formatar
      const antes = (input.value.slice(0, input.selectionStart || 0).match(/\d/g) || []).length;
      let d = input.value.replace(/\D/g, "");
      if ((d.length === 12 || d.length === 13) && d.startsWith("55")) d = d.slice(2); // colado com +55
      d = d.slice(0, 11);
      input.setCustomValidity(d.length === 0 || d.length >= 10 ? "" : "Informe o DDD e o número completo");
      let f = d;
      if (d.length > 6) f = "(" + d.slice(0, 2) + ") " + d.slice(2, d.length > 10 ? 7 : 6) + "-" + d.slice(d.length > 10 ? 7 : 6);
      else if (d.length > 2) f = "(" + d.slice(0, 2) + ") " + d.slice(2);
      else if (d.length > 0) f = "(" + d;
      input.value = f;
      let pos = 0, seen = 0; while (pos < f.length && seen < antes) { if (/\d/.test(f[pos])) seen++; pos++; }
      if (document.activeElement === input) { try { input.setSelectionRange(pos, pos); } catch (e) { /* tipo tel sem seleção em alguns navegadores */ } }
    });
  }

  window.App = { Fav, Consent, $, $$, icon, fmtBRL, fmtNum, fmtKm, esc, titleCase, vehName, vehShort, vehUrl, thumbUrl, fotoThumbUrl, brandKey, brandLogo, absUrl, waLink, waVehicleMsg, setWaMsg, telLink, openStatus, loadIndex, loadAll, loadReviews, stars, fmtNota, googleBadge, vehicleCard, sheet, toast, bindWaForms, maskPhone, socialRow };

  // imagens aparecem com fade (classe .is-loaded) em vez de "pipocar"
  document.addEventListener("load", (e) => { const t = e.target; if (t && t.tagName === "IMG") t.classList.add("is-loaded"); }, true);
  // imagem com data-fallback: se a miniatura local não existir, usa a foto original
  document.addEventListener("error", (e) => { const t = e.target; if (t && t.tagName === "IMG" && t.dataset.fallback && t.src !== t.dataset.fallback) { t.src = t.dataset.fallback; delete t.dataset.fallback; } }, true);

  function cookieNotice() {
    if (!S.analytics || (!S.analytics.ga4 && !S.analytics.metaPixel)) return;
    if (Consent.get()) return;
    const n = document.createElement("div"); n.className = "cookie-notice"; n.setAttribute("role", "region"); n.setAttribute("aria-label", "Aviso de cookies");
    n.innerHTML = '<p>Cookies para medir o uso do site e mostrar anúncios da loja no Google e na Meta. <a href="politica-de-privacidade.html">Saiba mais</a></p><button class="btn btn-outline btn-sm" type="button" data-c="necessary">Só o necessário</button><button class="btn btn-dark btn-sm" type="button" data-c="all">Aceitar</button>';
    $$("button", n).forEach((b) => b.addEventListener("click", () => { Consent.set(b.dataset.c); n.remove(); }));
    document.body.appendChild(n);
  }

  if ("serviceWorker" in navigator && location.protocol === "https:") {
    window.addEventListener("load", () => { navigator.serviceWorker.register(new URL("sw.js", document.baseURI).pathname).catch(() => { /* sem SW */ }); });
  }

  document.addEventListener("DOMContentLoaded", () => {
    renderChrome();
    cookieNotice();
    bindWaForms();
    $$('input[type="tel"]').forEach(maskPhone);
    $$("[data-wa-link]").forEach((a) => { a.href = waLink(a.getAttribute("data-wa-link") || undefined); a.target = "_blank"; a.rel = "noopener"; });
    $$("[data-tel-link]").forEach((a) => { a.href = telLink; });
    $$("[data-store]").forEach((el) => { const path = el.getAttribute("data-store").split("."); let v = S; for (const p of path) v = v && v[p]; if (v != null) el.textContent = v; });
  });
})();
