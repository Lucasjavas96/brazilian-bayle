/* Brazilian Bayle · release 2
   Pré-temporada: ranking, festas e resenhas são de demonstração e aparecem rotulados assim.
   Votos, candidaturas e lista de espera ficam só no navegador (localStorage) até existir um backend. */

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const fmt2 = n => n.toFixed(2).replace(".", ",");
const fmt1 = n => n.toFixed(1).replace(".", ",");
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d } catch { return d } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} }
};
function rnd(seed) { return () => (seed = (seed * 16807) % 2147483647, (seed - 1) / 2147483646) }
const wait = ms => new Promise(r => setTimeout(r, ms));
let tt; function toast(t) { const el = $("#toast"); if (!el) return; el.textContent = t; el.classList.add("on"); clearTimeout(tt); tt = setTimeout(() => el.classList.remove("on"), 3400) }

/* ---------- menu lateral (gaveta no celular) ---------- */
(() => {
  const btn = $("#burger"), side = $("#side"), scrim = $("#scrim");
  if (!btn) return;
  const set = open => {
    btn.setAttribute("aria-expanded", open); btn.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
    side.classList.toggle("open", open); scrim.hidden = !open;
    if (open) $(".side-nav a", side)?.focus();
  };
  btn.onclick = () => set(btn.getAttribute("aria-expanded") !== "true");
  scrim.onclick = () => set(false);
  document.addEventListener("keydown", e => { if (e.key === "Escape" && side.classList.contains("open")) { set(false); btn.focus() } });
  $$("a", side).forEach(a => a.addEventListener("click", () => set(false)));
})();

/* ---------- faixa ---------- */
(() => {
  const el = $("#ticker"); if (!el) return;
  const t = ["After do Solomun · 31.10", "BRB Clubbers · R$15/mês", "Temporada 2026 · Carnaval a Carnaval", "Só DJs brasileiros",
    "Os 5 melhores tocam na Final", "Avalie a performance dos DJs", "A pista é nossa"];
  el.innerHTML = [...t, ...t].map(x => `<span>${x}</span>`).join("");
})();

/* ---------- vídeo do topo ---------- */
(() => {
  const v = $("#heroVideo"); if (!v) return;
  v.muted = true; v.defaultMuted = true; v.loop = true; v.controls = false;
  v.disablePictureInPicture = true;
  v.play().catch(() => {});
})();

/* ---------- contagem regressiva ---------- */
document.querySelectorAll('.club-motion').forEach(button => {
  const section = button.closest('.club-teaser');
  const setPaused = paused => {
    section.classList.toggle('paused', paused);
    button.setAttribute('aria-pressed', String(paused));
    button.setAttribute('aria-label', paused ? 'Reproduzir imagens do clube' : 'Pausar imagens do clube');
  };
  setPaused(reduced);
  button.hidden = reduced;
  button.addEventListener('click', () => setPaused(!section.classList.contains('paused')));
});

(() => {
  if (!$("#cdD")) return;
  const AFTER = new Date("2026-10-31T23:00:00-03:00").getTime();
  const tick = () => {
    let s = Math.max(0, Math.floor((AFTER - Date.now()) / 1000));
    const d = Math.floor(s / 86400); s -= d * 86400; const h = Math.floor(s / 3600); s -= h * 3600; const m = Math.floor(s / 60); s -= m * 60;
    [["#cdD", d], ["#cdH", h], ["#cdM", m], ["#cdS", s]].forEach(([id, n]) => $(id).textContent = String(n).padStart(2, "0"));
  };
  tick(); setInterval(tick, 1000);
})();

/* ---------- critérios e dados de demonstração ---------- */
const CRIT = [
  ["som", "Qualidade do som"],
  ["harmonia", "Harmonia do set"],
  ["energia", "Energia e vibe"],
  ["sofisticacao", "Sofisticação e inovação"],
];
const DJS = [["Alok","House"],["Vintage Culture","House"],["Mochakk","Tech house"],["ANNA","Techno"],["Liu","Bass house"],
  ["Cat Dealers","Brazilian bass"],["Dubdogz","Brazilian bass"],["KVSH","Brazilian bass"],["Bhaskar","House"],["Chemical Surf","Brazilian bass"],
  ["Zerb","Afro house"],["Öwnboss","Bass house"],["RUBACK","Tech house"],["Victor Ruiz","Techno"],["Gui Boratto","Techno"],
  ["Illusionize","Tech house"],["Beltran","Tech house"],["Mojjo","House"],["Classmatic","Tech house"],["GREG","House"]];
const SEED = (() => {
  const r = rnd(42); let base = 9.24;
  return DJS.map(([name, style]) => {
    const n = base; base -= .05 + r() * .07;
    const votos = Math.floor((6 + r() * 12) * (55 + r() * 45)), w = votos * 1.4, sums = {};
    CRIT.forEach(([k]) => sums[k] = Math.min(9.9, n + (r() - .5) * .7) * w);
    return { name, style, votos, w, sums };
  });
})();
function table() {
  const rows = SEED.map(d => ({ ...d, sums: { ...d.sums } }));
  store.get("bb_votes", []).forEach(v => {
    const d = rows.find(x => x.name === v.dj); if (!d) return;
    const w = v.clubber ? 3 : 1; d.votos++; d.w += w; CRIT.forEach(([k]) => d.sums[k] += v.notas[k] * w);
  });
  rows.forEach(d => { CRIT.forEach(([k]) => d[k] = d.sums[k] / d.w); d.nota = CRIT.reduce((a, [k]) => a + d[k], 0) / 4 });
  rows.sort((a, b) => b.nota - a.nota).forEach((d, i) => d.pos = i + 1);
  return rows;
}
const meter = v => { const full = Math.floor(v), half = v - full >= .5; return `<span class="meter" aria-hidden="true">${Array.from({ length: 10 }, (_, i) => `<i class="${i < full ? "on" : i === full && half ? "half" : ""}"></i>`).join("")}</span>` };
const pad = n => String(n).padStart(2, "0");

/* ---------- pódio ---------- */
function renderPodium() {
  const el = $("[data-podium]"); if (!el) return;
  el.innerHTML = table().slice(0, 3).map(d => `
    <div class="pod p${d.pos}">
      <p class="pod-name">${d.name}</p><p class="pod-style mono">${d.style}</p>
      <p class="led" aria-label="nota ${fmt2(d.nota)}">${fmt2(d.nota)}</p>
      <div class="pod-block"><div class="top" aria-hidden="true"></div><div class="face"><span class="num3d" aria-label="${d.pos}º lugar">${pad(d.pos)}</span></div></div>
    </div>`).join("");
}

/* ---------- tabela ---------- */
const boards = [];
function mountBoard(stage) {
  const limit = +stage.dataset.limit || 0, sortable = stage.hasAttribute("data-sortable");
  const st = { sort: "nota", style: "Todos", last: {}, flash: null };
  const head = [["nota", "Nota"], ...CRIT, ["votos", "Votos"]];
  stage.innerHTML = `<table class="board">
    <caption class="sr-only">Brasileirão dos DJs, pré-temporada com notas de demonstração${limit ? `, ${limit} primeiros` : ""}</caption>
    <thead><tr><th scope="col">#</th><th scope="col" class="l">DJ</th>${head.map(([k, l]) => `<th scope="col"${k === "nota" ? ' aria-sort="descending"' : ""} data-k="${k}">${sortable ? `<button type="button" data-sort="${k}">${l}</button>` : l}</th>`).join("")}</tr></thead>
    <tbody></tbody></table>`;
  const filters = sortable && $("[data-filters]");
  if (filters) {
    const styles = ["Todos", ...new Set(DJS.map(d => d[1]))];
    filters.innerHTML = styles.map(s => `<button class="chip" type="button" aria-pressed="${s === "Todos"}" data-s="${s}">${s}</button>`).join("");
    filters.onclick = e => { const b = e.target.closest(".chip"); if (!b) return; st.style = b.dataset.s; $$(".chip", filters).forEach(c => c.setAttribute("aria-pressed", c === b)); render() };
  }
  if (sortable) $("thead", stage).onclick = e => {
    const b = e.target.closest("button[data-sort]"); if (!b) return; st.sort = b.dataset.sort;
    $$("th[data-k]", stage).forEach(th => th.dataset.k === st.sort ? th.setAttribute("aria-sort", "descending") : th.removeAttribute("aria-sort")); render();
  };
  function render() {
    const rows = table();
    let list = rows.filter(d => st.style === "Todos" || d.style === st.style);
    if (st.sort !== "nota") list = [...list].sort((a, b) => b[st.sort] - a[st.sort]);
    if (limit) list = list.slice(0, limit);
    $("tbody", stage).innerHTML = list.map(d => {
      const prev = st.last[d.name], mv = prev && prev !== d.pos ? (prev > d.pos ? `<span class="mv up" aria-label="subiu ${prev - d.pos}">▲${prev - d.pos}</span>` : `<span class="mv dn" aria-label="caiu ${d.pos - prev}">▼${d.pos - prev}</span>`) : "";
      return `<tr class="${d.pos <= 5 ? "z5" : ""}${d.pos === 5 ? " cut" : ""}${d.name === st.flash ? " flash" : ""}">
        <td class="b-pos"><span class="num3d">${pad(d.pos)}</span></td>
        <td class="b-dj l"><b>${d.name}</b>${mv}<span class="mono">${d.style}</span>${d.pos <= 5 ? `<span class="sr-only">, zona da Final</span>` : ""}</td>
        <td class="b-score"><span class="led">${fmt2(d.nota)}</span></td>
        ${CRIT.map(([k, l]) => `<td class="b-crit" data-label="${l}">${meter(d[k])}<span class="v">${fmt1(d[k])}</span></td>`).join("")}
        <td class="b-votes">${d.votos.toLocaleString("pt-BR")}</td></tr>`;
    }).join("");
    rows.forEach(d => st.last[d.name] = d.pos); st.flash = null;
  }
  render();
  boards.push({ render, flash: n => { st.flash = n; render() } });
}
$$("[data-board]").forEach(mountBoard);
renderPodium();

/* ---------- avaliar ---------- */
(() => {
  const form = $("#voteForm"); if (!form) return;
  const PARTIES = [
    { id: "gv-0709", label: "Green Valley · 07/09 (demonstração)", dj: ["Alok", "Mochakk", "Classmatic"] },
    { id: "sr-1409", label: "Surreal · 14/09 (demonstração)", dj: ["Vintage Culture", "Liu", "Öwnboss"] },
    { id: "wr-2109", label: "Warung · 21/09 (demonstração)", dj: ["ANNA", "Victor Ruiz", "Gui Boratto"] },
    { id: "lr-2809", label: "Laroc · 28/09 (demonstração)", dj: ["Cat Dealers", "Dubdogz", "KVSH"] },
    { id: "gv-1210", label: "Green Valley · 12/10 (demonstração)", dj: ["Zerb", "Mojjo", "Beltran", "Illusionize"] },
  ];
  let dj = null; const touched = new Set();
  const party = $("#vParty"), lineup = $("#vLineup");
  party.innerHTML = `<option value="">Escolha a festa</option>` + PARTIES.map(p => `<option value="${p.id}">${p.label}</option>`).join("");
  const renderLineup = () => {
    const p = PARTIES.find(x => x.id === party.value);
    lineup.innerHTML = p ? p.dj.map(n => `<button type="button" aria-pressed="${n === dj}" data-dj="${n}">${n}</button>`).join("") : `<span class="hint">Escolha a festa primeiro.</span>`;
  };
  party.onchange = () => { dj = null; renderLineup(); err("eParty", "") };
  lineup.onclick = e => { const b = e.target.closest("button"); if (!b) return; dj = b.dataset.dj; renderLineup(); err("eDj", ""); $(`[data-dj="${dj}"]`, lineup)?.focus() };
  renderLineup();

  $("#vSliders").innerHTML = CRIT.map(([k, l]) => `<div class="sl unset" id="row_${k}">
    <label for="s_${k}">${l}</label>
    <input type="range" min="0" max="10" step="0.5" value="5" id="s_${k}" aria-describedby="o_${k}" aria-valuetext="Não avaliado">
    <output id="o_${k}" for="s_${k}">—</output></div>`).join("");
  const updateAvg = () => {
    let t = 0;
    CRIT.forEach(([k]) => {
      const el = $("#s_" + k), v = +el.value, ok = touched.has(k);
      $("#row_" + k).classList.toggle("unset", !ok);
      $("#o_" + k).textContent = ok ? fmt1(v) : "—";
      el.setAttribute("aria-valuetext", ok ? `${fmt1(v)} de 10` : "Não avaliado");
      el.style.setProperty("--p", ok ? v * 10 + "%" : "0%"); t += v;
    });
    $("#vAvg").textContent = touched.size === 4 ? fmt1(t / 4) : "—";
  };
  CRIT.forEach(([k]) => {
    const el = $("#s_" + k);
    const mark = () => { touched.add(k); updateAvg(); if (touched.size === 4) err("eNotas", "") };
    el.addEventListener("input", mark); el.addEventListener("change", mark);
    el.addEventListener("pointerdown", () => setTimeout(mark, 0));
  });
  updateAvg();

  function err(id, text) { const p = $("#" + id); if (!p) return; p.textContent = text; const f = p.id && $(`[aria-describedby~="${p.id}"]`); if (f && f.matches("input,select")) f.setAttribute("aria-invalid", !!text) }
  const say = (cls, html) => { const m = $("#voteMsg"); m.className = "form-msg " + cls; m.innerHTML = html };
  $("#vIg").addEventListener("blur", e => { const v = e.target.value.trim(); if (v && !v.startsWith("@")) e.target.value = "@" + v });

  form.onsubmit = async e => {
    e.preventDefault(); say("", "");
    const name = $("#vName").value.trim(), ig = $("#vIg").value.trim().toLowerCase().replace(/^@?/, "@");
    let first = null; const bad = (id, t, el) => { err(id, t); if (t && !first) first = el };
    bad("eParty", party.value ? "" : "Escolha a festa em que você esteve.", party);
    bad("eDj", dj || !party.value ? "" : "Escolha o DJ que você quer avaliar.", lineup.querySelector("button"));
    bad("eName", name.length >= 2 ? "" : "Escreva seu nome.", $("#vName"));
    bad("eIg", /^@[a-z0-9._]{2,30}$/.test(ig) ? "" : "Use o formato @seu.perfil, só com letras, números, ponto e _.", $("#vIg"));
    bad("eNotas", touched.size === 4 ? "" : `Dê nota nos 4 critérios. Faltam ${4 - touched.size}.`, $(`#s_${CRIT.find(([k]) => !touched.has(k))?.[0] || "som"}`));
    bad("eConsent", $("#vConsent").checked ? "" : "Para votar, aceite a política de privacidade.", $("#vConsent"));
    if (first) { say("err", "Confira os campos marcados acima."); first.focus(); return }
    const votes = store.get("bb_votes", []);
    if (votes.some(v => v.party === party.value && v.dj === dj && v.ig === ig)) { say("err", `${ig} já avaliou ${dj} nessa festa. É um voto por @ em cada apresentação.`); return }
    const btn = $("#voteBtn"); btn.classList.add("loading"); btn.setAttribute("aria-busy", "true");
    await wait(600);
    const notas = {}; CRIT.forEach(([k]) => notas[k] = +$("#s_" + k).value);
    votes.push({ party: party.value, dj, ig, name, notas, clubber: $("#vClubber").checked, comment: $("#vComment").value.trim(), at: Date.now() });
    store.set("bb_votes", votes);
    btn.classList.remove("loading"); btn.removeAttribute("aria-busy");
    say("ok", `<b>Voto registrado.</b> Sua avaliação de ${dj}${$("#vClubber").checked ? " (peso 3)" : ""} entrou na tabela de demonstração. Na pré-temporada, ela fica salva só neste navegador.`);
    boards.forEach(b => b.flash(dj)); renderPodium();
    toast("Voto registrado. A tabela foi atualizada.");
    $("#vComment").value = "";
  };
})();

/* ---------- cartão do clube ---------- */
$$("[data-tilt]").forEach(card => {
  if (reduced) return;
  const wrap = card.parentElement;
  wrap.addEventListener("mousemove", e => { const b = card.getBoundingClientRect(), x = (e.clientX - b.left) / b.width - .5, y = (e.clientY - b.top) / b.height - .5; card.style.transform = `rotateY(${x * 22}deg) rotateX(${-y * 16}deg)` });
  wrap.addEventListener("mouseleave", () => card.style.transform = "");
});

/* ---------- formulários simples (candidatura e lista de espera) ---------- */
function simpleForm({ form, btn, msg, key, checks, done }) {
  const f = $(form); if (!f) return;
  const setErr = (id, t) => { const p = $("#" + id); p.textContent = t; const field = $(`[aria-describedby~="${id}"]`); if (field && field.matches("input,select")) field.setAttribute("aria-invalid", !!t) };
  f.onsubmit = async e => {
    e.preventDefault(); const m = $(msg); m.className = "form-msg"; m.textContent = "";
    let first = null;
    for (const [id, test, text, el] of checks()) { const ok = test(); setErr(id, ok ? "" : text); if (!ok && !first) first = $(el) }
    if (first) { m.className = "form-msg err"; m.textContent = "Confira os campos marcados."; first.focus(); return }
    const b = $(btn); b.classList.add("loading"); b.setAttribute("aria-busy", "true");
    await wait(600);
    const data = Object.fromEntries(new FormData(f).entries()); data.at = Date.now();
    const list = store.get(key, []); list.push(data); store.set(key, list);
    b.classList.remove("loading"); b.removeAttribute("aria-busy");
    m.className = "form-msg ok"; m.innerHTML = done(data); f.reset(); f.dispatchEvent(new Event("input"));
  };
}
const igOk = v => /^@?[a-z0-9._]{2,30}$/i.test(v.trim());
const mailOk = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
simpleForm({
  form: "#applyForm", btn: "#applyBtn", msg: "#applyMsg", key: "bb_apps",
  checks: () => [
    ["eaName", () => $("#aName").value.trim().length >= 2, "Escreva seu nome.", "#aName"],
    ["eaIg", () => igOk($("#aIg").value), "Use o formato @seu.perfil.", "#aIg"],
    ["eaEmail", () => mailOk($("#aEmail").value), "Confira o e-mail.", "#aEmail"],
    ["eaConsent", () => $("#aConsent").checked, "Confirme que tem 18 anos ou mais e aceite os termos.", "#aConsent"],
  ],
  done: () => "<b>Candidatura recebida.</b> Na pré-temporada ela fica salva só neste navegador. Para garantir sua vaga na seleção do 31.10, mande também um direct para o @brazilianbayle.",
});
simpleForm({
  form: "#dropForm", btn: "#dropBtn", msg: "#dropMsg", key: "bb_drop",
  checks: () => [
    ["edEmail", () => mailOk($("#dEmail").value), "Confira o e-mail.", "#dEmail"],
    ["edConsent", () => $("#dConsent").checked, "Para entrar na lista, aceite receber o aviso.", "#dConsent"],
  ],
  done: () => "<b>Você está na lista.</b> Na pré-temporada a inscrição fica salva só neste navegador; o aviso oficial do drop sai no @brazilianbayle.",
});
(() => { const ig = $("#aIg"), cc = $("#ccIg"); if (!ig || !cc) return; ig.addEventListener("input", () => cc.textContent = ig.value ? "@" + ig.value.replace(/^@/, "").toUpperCase() : "@SEU.PERFIL") })();

/* ---------- resenhas (exemplos) ---------- */
(() => {
  const REV = [
    { i: "EX", n: "Exemplo de crítico", f: 23, t: "Green Valley, 07/09:", e: "o fechamento que ninguém esperava", p: "Começou contido, segurou a pista por uma hora e virou o jogo no último terço. Graves impecáveis e uma leitura de público rara.", s: [9, 8, 10, 9] },
    { i: "EX", n: "Exemplo de crítica", f: 17, t: "Warung, 21/09:", e: "techno de templo", p: "Set longo, sem pressa, com transições que você só percebe depois. O tipo de noite que justifica a estrada até Itajaí.", s: [10, 9, 8, 10] },
    { i: "EX", n: "Exemplo de crítico", f: 31, t: "Surreal, 14/09:", e: "energia do começo ao fim", p: "Não deu respiro. Faltou variação no meio, mas a pista não parou um minuto e o som da casa ajudou muito.", s: [8, 7, 10, 7] },
  ];
  $$("[data-reviews]").forEach(el => {
    const lim = +el.dataset.limit || REV.length;
    el.innerHTML = REV.slice(0, lim).map((v, ix) => {
      const r = rnd(5 + ix * 7);
      const bars = Array.from({ length: 56 }, (_, i) => { const x = i / 56, env = .35 + .65 * Math.abs(Math.sin(x * Math.PI * 3)); return `<i style="height:${Math.max(3, 36 * env * (.35 + .65 * r()))}px"></i>` }).join("");
      return `<article class="rev"><div class="rev-top"><span class="av" aria-hidden="true">${v.i}</span><div><b>${v.n}</b><span class="mono">BRB Clubber · ${v.f} festas · exemplo</span></div></div>
        <h3>${v.t} <em>${v.e}</em></h3><div class="wave" aria-hidden="true">${bars}</div><p>${v.p}</p>
        <div class="scores">${CRIT.map(([, l], j) => `<span>${l} <b>${v.s[j]}</b></span>`).join("")}</div></article>`;
    }).join("");
  });
})();

/* ---------- fundos desfocados: só baixam quando vão aparecer ---------- */
function showBg(el) { if (el && el.dataset.bg) { el.style.backgroundImage = `url(${el.dataset.bg})`; delete el.dataset.bg } }
(() => {
  const els = $$(".mp-bg[data-bg]"); if (!els.length) return;
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { showBg(e.target); io.unobserve(e.target) } }), { rootMargin: "50% 0px" });
  els.forEach(el => io.observe(el));
})();

/* ---------- carrosséis ---------- */
$$(".slides").forEach(box => {
  const items = $$(".slide", box), ms = +box.dataset.auto || 4000;
  let i = 0, timer, paused = reduced;
  items.forEach((s, k) => { s.setAttribute("role", "group"); s.setAttribute("aria-roledescription", "slide"); s.setAttribute("aria-label", `${k + 1} de ${items.length}`) });
  const ui = document.createElement("div"); ui.className = "sl-ui";
  ui.innerHTML = `<button class="sl-prev" type="button" aria-label="Foto anterior">‹</button>
    <button class="sl-play" type="button" aria-label="${paused ? "Retomar" : "Pausar"} troca automática">${paused ? "▶" : "❚❚"}</button>
    <div class="sl-dots">${items.map((_, k) => `<button type="button" aria-label="Ir para a foto ${k + 1}"></button>`).join("")}</div>
    <span class="sl-count mono" aria-hidden="true"></span>
    <button class="sl-next" type="button" aria-label="Próxima foto">›</button>`;
  const bar = document.createElement("div"); bar.className = "sl-bar"; bar.style.setProperty("--ms", ms + "ms");
  box.append(ui, bar);
  const dots = $$(".sl-dots button", ui), play = $(".sl-play", ui);
  const schedule = () => { clearTimeout(timer); bar.classList.remove("run"); if (paused) return; void bar.offsetWidth; bar.classList.add("run"); timer = setTimeout(() => go(i + 1), ms) };
  function go(n) {
    i = (n + items.length) % items.length;
    items.forEach((s, k) => { s.classList.toggle("on", k === i); s.setAttribute("aria-hidden", k !== i) });
    dots.forEach((d, k) => d.setAttribute("aria-current", k === i));
    $(".sl-count", ui).textContent = pad(i + 1) + " / " + pad(items.length);
    [items[i], items[(i + 1) % items.length]].forEach(s => { const img = $("img", s); if (img) img.loading = "eager"; showBg($(".sl-bg", s)) });
    schedule();
  }
  const setPaused = p => { paused = p; box.classList.toggle("paused", p); play.textContent = p ? "▶" : "❚❚"; play.setAttribute("aria-label", `${p ? "Retomar" : "Pausar"} troca automática`); schedule() };
  play.onclick = () => setPaused(!paused);
  $(".sl-prev", ui).onclick = () => go(i - 1);
  $(".sl-next", ui).onclick = () => go(i + 1);
  dots.forEach((d, k) => d.onclick = () => go(k));
  box.addEventListener("focusin", () => { clearTimeout(timer); bar.classList.remove("run") });
  box.addEventListener("focusout", () => schedule());
  let x0 = null;
  box.addEventListener("touchstart", e => x0 = e.touches[0].clientX, { passive: true });
  box.addEventListener("touchend", e => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1)); x0 = null });
  // só roda quando está visível
  new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) schedule(); else { clearTimeout(timer); bar.classList.remove("run") } })).observe(box);
  if (paused) box.classList.add("paused");
  go(0);
});

/* ---------- entrada suave (sem medir a página antes: só esconde o que o observador diz estar fora da tela) ---------- */
(() => {
  if (reduced || !("IntersectionObserver" in window)) return;
  const els = $$(".sec-head, .event, .board-stage, .vote-card, .plan, .apply-form, .rev, .drop-form, .how li");
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target) }
    else if (e.boundingClientRect.top > 0 && !e.target.classList.contains("rv")) e.target.classList.add("rv");
  }), { rootMargin: "0px 0px 20% 0px" });
  els.forEach(el => io.observe(el));
  addEventListener("hashchange", () => $$(".rv:not(.in)").forEach(el => el.classList.add("in")));
})();

/* Revelação progressiva em todas as páginas; mantém em e links dos títulos. */
(() => {
  if (reduced || !('IntersectionObserver' in window)) return;
  const headings = [...document.querySelectorAll('main h1, main h2, main h3, .foot-title')];
  headings.forEach(heading => {
    const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
    const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
    let index = 0;
    nodes.forEach(node => {
      const fragment = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach(part => {
        if (!part.trim()) { fragment.append(document.createTextNode(part)); return; }
        const word = document.createElement('span');
        word.className = 'reveal-word'; word.textContent = part;
        word.style.setProperty('--word-delay', `${index++ * 85}ms`);
        fragment.append(word);
      });
      node.replaceWith(fragment);
    });
  });
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add(entry.target.matches('section') ? 'section-visible' : 'words-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0, rootMargin: '0px 0px -35px 0px' });
  document.querySelectorAll('main > section:not(:first-child)').forEach(section => {
    section.classList.add('section-reveal'); observer.observe(section);
  });
  headings.forEach(heading => observer.observe(heading));
})();
