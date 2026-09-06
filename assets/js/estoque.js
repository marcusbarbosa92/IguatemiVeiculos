/* estoque.js — listagem com filtros, ordenação e estado na URL */
(function () {
  "use strict";
  const A = window.App, $ = A.$, $$ = A.$$, esc = A.esc, icon = A.icon;
  const PRICES = [20000, 30000, 40000, 50000, 75000, 100000, 150000, 200000, 300000, 400000, 500000, 700000];
  const TAGS = ["Blindado", "7 lugares", "Único Dono", "Garantia de Fábrica", "Revisado em Concessionária", "IPVA Pago", "Licenciado", "Chave Reserva", "Manual do proprietário"];
  const PAGE = 24;
  let ALL = [], state = {}, shown = 0, filtered = [];

  const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

  function readState() {
    const p = new URLSearchParams(location.search);
    state = {
      q: p.get("q") || "", tipo: p.get("tipo") || "", marca: p.get("marca") || "", modelo: p.get("modelo") || "",
      precoMin: p.get("precoMin") || "", precoMax: p.get("precoMax") || "", anoMin: p.get("anoMin") || "", kmMax: p.get("kmMax") || "",
      cambio: p.getAll("cambio"), combustivel: p.getAll("combustivel"), tag: p.getAll("tag"), ordem: p.get("ordem") || "novidades"
    };
  }
  function writeState() {
    const p = new URLSearchParams();
    ["q", "tipo", "marca", "modelo", "precoMin", "precoMax", "anoMin", "kmMax"].forEach((k) => { if (state[k]) p.set(k, state[k]); });
    ["cambio", "combustivel", "tag"].forEach((k) => state[k].forEach((v) => p.append(k, v)));
    if (state.ordem && state.ordem !== "novidades") p.set("ordem", state.ordem);
    const qs = p.toString();
    history.replaceState(null, "", location.pathname + (qs ? "?" + qs : ""));
  }

  function apply() {
    const q = norm(state.q).split(/\s+/).filter(Boolean);
    filtered = ALL.filter((v) => {
      if (state.tipo && v.tipo !== state.tipo) return false;
      if (state.marca && v.marca !== state.marca) return false;
      if (state.modelo && v.modelo !== state.modelo) return false;
      if (state.precoMin && v.preco < +state.precoMin) return false;
      if (state.precoMax && v.preco > +state.precoMax) return false;
      if (state.anoMin && v.anoModelo < +state.anoMin) return false;
      if (state.kmMax && v.km > +state.kmMax) return false;
      if (state.cambio.length && !state.cambio.includes(v.cambio)) return false;
      if (state.combustivel.length && !state.combustivel.includes(v.combustivel)) return false;
      if (state.tag.length && !state.tag.every((t) => v.caracteristicas.includes(t))) return false;
      if (q.length) { const hay = norm(v.marca + " " + v.modelo + " " + v.versao + " " + v.anoModelo + " " + v.combustivel + " " + v.cambio); if (!q.every((w) => hay.includes(w))) return false; }
      return true;
    });
    const s = state.ordem;
    filtered.sort((a, b) =>
      s === "preco-asc" ? a.preco - b.preco :
      s === "preco-desc" ? b.preco - a.preco :
      s === "ano" ? (b.anoModelo - a.anoModelo) || (a.km - b.km) :
      s === "km" ? a.km - b.km :
      s === "marca" ? (a.marca + " " + a.modelo + " " + a.versao).localeCompare(b.marca + " " + b.modelo + " " + b.versao) :
      b.id - a.id);
    shown = 0;
    $("#results").innerHTML = "";
    renderMore();
    const n = filtered.length;
    $("#results-count").innerHTML = n ? "<b>" + n + "</b> " + (n === 1 ? "veículo encontrado" : "veículos encontrados") : "Nenhum veículo encontrado";
    renderActive();
    writeState();
  }
  function renderMore() {
    const slice = filtered.slice(shown, shown + PAGE);
    if (!filtered.length) {
      $("#results").innerHTML = '<div class="empty" style="grid-column:1/-1">' + icon("search") + "<b>Nenhum veículo com esses filtros.</b><span>Tente remover algum filtro ou fale com a gente: talvez tenhamos algo chegando.</span><button class=\"btn btn-outline\" type=\"button\" id=\"empty-clear\">Limpar filtros</button><a class=\"btn btn-wa\" href=\"" + A.waLink("Olá! Procuro um veículo específico e não encontrei no site. Podem me ajudar?") + '" target="_blank" rel="noopener">' + icon("whatsapp") + " Falar no WhatsApp</a></div>";
      $("#empty-clear").addEventListener("click", clearAll);
    } else {
      $("#results").insertAdjacentHTML("beforeend", slice.map((v, i) => A.vehicleCard(v, { eager: shown === 0 && i < 2 })).join(""));
    }
    shown += slice.length;
    $("#load-more").hidden = shown >= filtered.length;
    if (shown < filtered.length) $("#btn-more").textContent = "Carregar mais (" + (filtered.length - shown) + " restantes)";
  }
  function clearAll() { state = { q: "", tipo: "", marca: "", modelo: "", precoMin: "", precoMax: "", anoMin: "", kmMax: "", cambio: [], combustivel: [], tag: [], ordem: state.ordem }; syncControls(); apply(); }

  function activeList() {
    const out = [];
    if (state.q) out.push(["q", "", "“" + state.q + "”"]);
    if (state.tipo) out.push(["tipo", "", state.tipo === "moto" ? "Motos" : "Carros"]);
    if (state.marca) out.push(["marca", "", A.titleCase(state.marca)]);
    if (state.modelo) out.push(["modelo", "", state.modelo]);
    if (state.precoMin) out.push(["precoMin", "", "de " + A.fmtBRL(+state.precoMin)]);
    if (state.precoMax) out.push(["precoMax", "", "até " + A.fmtBRL(+state.precoMax)]);
    if (state.anoMin) out.push(["anoMin", "", "a partir de " + state.anoMin]);
    if (state.kmMax) out.push(["kmMax", "", "até " + A.fmtKm(+state.kmMax)]);
    state.cambio.forEach((v) => out.push(["cambio", v, v]));
    state.combustivel.forEach((v) => out.push(["combustivel", v, v]));
    state.tag.forEach((v) => out.push(["tag", v, v]));
    return out;
  }
  function renderActive() {
    const act = activeList();
    $("#filter-count").hidden = !act.length; $("#filter-count").textContent = act.length;
    $("#active-filters").innerHTML = act.map((a) => '<button class="chip on" type="button" data-k="' + esc(a[0]) + '" data-v="' + esc(a[1]) + '">' + esc(a[2]) + icon("close") + "</button>").join("") + (act.length > 1 ? '<button class="chip" type="button" id="chip-clear">Limpar tudo</button>' : "");
    $$("#active-filters .chip[data-k]").forEach((b) => b.addEventListener("click", () => {
      const k = b.dataset.k, v = b.dataset.v;
      if (Array.isArray(state[k])) state[k] = state[k].filter((x) => x !== v); else state[k] = "";
      syncControls(); apply();
    }));
    const c = $("#chip-clear"); if (c) c.addEventListener("click", clearAll);
  }

  /* ---------- Controles da folha de filtros ---------- */
  function buildControls() {
    const cnt = (fn) => ALL.filter(fn).length;
    const marcas = {}; ALL.forEach((v) => { marcas[v.marca] = (marcas[v.marca] || 0) + 1; });
    Object.keys(marcas).sort().forEach((m) => $("#f-marca").insertAdjacentHTML("beforeend", '<option value="' + esc(m) + '">' + esc(A.titleCase(m)) + " (" + marcas[m] + ")</option>"));
    PRICES.forEach((p) => { $("#f-precoMin").insertAdjacentHTML("beforeend", '<option value="' + p + '">' + A.fmtBRL(p) + "</option>"); $("#f-precoMax").insertAdjacentHTML("beforeend", '<option value="' + p + '">' + A.fmtBRL(p) + "</option>"); });
    Array.from(new Set(ALL.map((v) => v.anoModelo))).sort((a, b) => b - a).forEach((y) => $("#f-anoMin").insertAdjacentHTML("beforeend", '<option value="' + y + '">' + y + "</option>"));
    const chipGroup = (id, values, key, countFn) => {
      $("#" + id).innerHTML = values.map((val) => { const n = countFn(val); return n ? '<button class="chip" type="button" data-key="' + key + '" data-val="' + esc(val) + '" aria-pressed="false">' + esc(val) + '<span class="n">' + n + "</span></button>" : ""; }).join("");
      $$("#" + id + " .chip").forEach((b) => b.addEventListener("click", () => {
        const on = b.getAttribute("aria-pressed") !== "true"; b.setAttribute("aria-pressed", on ? "true" : "false");
        const arr = state[key]; const v = b.dataset.val;
        if (on && !arr.includes(v)) arr.push(v); if (!on) state[key] = arr.filter((x) => x !== v);
        updateApplyCount();
      }));
    };
    chipGroup("f-cambio", Array.from(new Set(ALL.map((v) => v.cambio))).sort(), "cambio", (val) => cnt((v) => v.cambio === val));
    chipGroup("f-combustivel", Array.from(new Set(ALL.map((v) => v.combustivel))).sort(), "combustivel", (val) => cnt((v) => v.combustivel === val));
    chipGroup("f-tag", TAGS, "tag", (val) => cnt((v) => v.caracteristicas.includes(val)));
    $("#f-marca").addEventListener("change", () => { state.marca = $("#f-marca").value; state.modelo = ""; fillModels(); updateApplyCount(); });
    $("#f-modelo").addEventListener("change", () => { state.modelo = $("#f-modelo").value; updateApplyCount(); });
    ["precoMin", "precoMax", "anoMin"].forEach((k) => $("#f-" + k).addEventListener("change", () => { state[k] = $("#f-" + k).value; updateApplyCount(); }));
    $$("#f-tipo button").forEach((b) => b.addEventListener("click", () => { state.tipo = b.dataset.val; $$("#f-tipo button").forEach((x) => x.setAttribute("aria-pressed", x === b ? "true" : "false")); updateApplyCount(); }));
    $("#f-clear").addEventListener("click", () => { clearAll(); });
    $("#f-apply").addEventListener("click", () => { apply(); filtersSheet.close(); window.scrollTo({ top: 0, behavior: "smooth" }); });
  }
  function fillModels() {
    const sel = $("#f-modelo"); sel.innerHTML = '<option value="">Todos os modelos</option>';
    const src = state.marca ? ALL.filter((v) => v.marca === state.marca) : ALL;
    const cnt = {}; src.forEach((v) => { cnt[v.modelo] = (cnt[v.modelo] || 0) + 1; });
    Object.keys(cnt).sort().forEach((m) => sel.insertAdjacentHTML("beforeend", '<option value="' + esc(m) + '">' + esc(m) + " (" + cnt[m] + ")</option>"));
    sel.value = state.modelo || "";
  }
  function syncControls() {
    $("#q").value = state.q; $("#q-clear").hidden = !state.q;
    $("#f-marca").value = state.marca; fillModels();
    $("#f-precoMin").value = state.precoMin; $("#f-precoMax").value = state.precoMax; $("#f-anoMin").value = state.anoMin;
    $$("#f-tipo button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.val === state.tipo ? "true" : "false"));
    $$("#f-cambio .chip, #f-combustivel .chip, #f-tag .chip").forEach((b) => b.setAttribute("aria-pressed", state[b.dataset.key].includes(b.dataset.val) ? "true" : "false"));
    $("#ordem").value = state.ordem;
    updateApplyCount();
  }
  function updateApplyCount() {
    const q = norm(state.q).split(/\s+/).filter(Boolean);
    const n = ALL.filter((v) =>
      (!state.tipo || v.tipo === state.tipo) && (!state.marca || v.marca === state.marca) && (!state.modelo || v.modelo === state.modelo) &&
      (!state.precoMin || v.preco >= +state.precoMin) && (!state.precoMax || v.preco <= +state.precoMax) && (!state.anoMin || v.anoModelo >= +state.anoMin) &&
      (!state.kmMax || v.km <= +state.kmMax) &&
      (!state.cambio.length || state.cambio.includes(v.cambio)) && (!state.combustivel.length || state.combustivel.includes(v.combustivel)) &&
      (!state.tag.length || state.tag.every((t) => v.caracteristicas.includes(t))) &&
      (!q.length || q.every((w) => norm(v.marca + " " + v.modelo + " " + v.versao + " " + v.anoModelo + " " + v.combustivel + " " + v.cambio).includes(w)))).length;
    $("#f-apply").textContent = n ? "Ver " + n + (n === 1 ? " veículo" : " veículos") : "Nenhum veículo";
  }

  let filtersSheet;
  document.addEventListener("DOMContentLoaded", async () => {
    readState();
    filtersSheet = A.sheet("filters");
    $("#btn-filters").addEventListener("click", () => { syncControls(); filtersSheet.open(); });
    let t; $("#q").addEventListener("input", () => { clearTimeout(t); t = setTimeout(() => { state.q = $("#q").value.trim(); $("#q-clear").hidden = !state.q; apply(); }, 220); });
    $("#q-clear").addEventListener("click", () => { $("#q").value = ""; state.q = ""; $("#q-clear").hidden = true; apply(); $("#q").focus(); });
    $("#ordem").addEventListener("change", () => { state.ordem = $("#ordem").value; apply(); });
    $("#btn-more").addEventListener("click", renderMore);
    try {
      const data = await A.loadIndex();
      ALL = data.veiculos;
      if (data.atualizadoEm) { const [y, m, d] = data.atualizadoEm.split("-"); $("#results-updated").textContent = "Atualizado em " + d + "/" + m + "/" + y; }
      buildControls(); syncControls(); apply();
    } catch (err) {
      $("#results").innerHTML = '<div class="empty" style="grid-column:1/-1">' + icon("info") + "<b>Não foi possível carregar o estoque.</b><span>" + esc(err.message) + "</span></div>";
      $("#results-count").textContent = "";
    }
  });
})();
