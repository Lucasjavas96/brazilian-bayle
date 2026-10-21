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
function rankAward(position) {
  if (position > 3) return '';
  const label = position === 1 ? 'Coroa do primeiro colocado' : `Medalha de ${position === 2 ? 'prata' : 'bronze'}`;
  const shape = position === 1
    ? '<path d="M3 7l5 4 4-7 4 7 5-4-2 12H5L3 7z"/><path d="M6 22h12" fill="none" stroke="currentColor" stroke-width="2"/>'
    : '<path d="M6 2h5l2 7-5 2-2-9zm12 0h-5l-2 7 5 2 2-9z" opacity=".65"/><circle cx="12" cy="15" r="7"/><circle cx="12" cy="15" r="5" fill="none" stroke="#000" stroke-opacity=".3"/><text x="12" y="18" text-anchor="middle" fill="#141414" font-size="9" font-family="sans-serif" font-weight="700">' + position + '</text>';
  return `<svg class="rank-award" viewBox="0 0 24 24" role="img" aria-label="${label}" fill="currentColor">${shape}</svg>`;
}
function renderPodium() {
  const el = $("[data-podium]"); if (!el) return;
  el.innerHTML = table().slice(0, 3).map(d => `
    <div class="pod p${d.pos}">
      ${rankAward(d.pos)}
      <p class="pod-name">${d.name}</p><p class="pod-style mono">${d.style}</p>
      <p class="led" aria-label="nota ${fmt2(d.nota)}">${fmt2(d.nota)}</p>
      <div class="pod-block"><div class="top" aria-hidden="true"></div><div class="face"><span class="num3d" aria-label="${d.pos}º lugar">${pad(d.pos)}</span></div></div>
    </div>`).join("");
}

/* ---------- tabela ---------- */
const boards = [];
function mountBoard(stage) {
  const limit = +stage.dataset.limit || 0, sortable = stage.hasAttribute("data-sortable");
  const st = { sort: "nota", style: "Todos", last: {}, flash: null, expanded: false };
  stage.classList.add('board-summary');
  const head = [["nota", "Nota"], ...CRIT, ["votos", "Votos"]];
  stage.innerHTML = `<table class="board">
    <caption class="sr-only">Brasileirão dos DJs, pré-temporada com notas de demonstração${limit ? `, ${limit} primeiros` : ""}</caption>
    <thead><tr><th scope="col">#</th><th scope="col" class="l">DJ</th>${head.map(([k, l]) => `<th scope="col"${k === "nota" ? ' aria-sort="descending"' : ""} data-k="${k}">${sortable ? `<button type="button" data-sort="${k}">${l}</button>` : l}</th>`).join("")}</tr></thead>
    <tbody></tbody></table>`;
  const more = document.createElement('button'); more.type = 'button'; more.className = 'btn btn-line-light board-more';
  more.setAttribute('aria-expanded', 'false');
  if (sortable) stage.append(more);
  more.onclick = () => { st.expanded = !st.expanded; render(); };
  stage.addEventListener('click', e => {
    const button = e.target.closest('[data-dj-details]'); if (!button) return;
    const row = button.closest('tr'), open = row.classList.toggle('details-open');
    button.setAttribute('aria-expanded', String(open)); button.textContent = open ? 'Fechar detalhes −' : 'Ver detalhes +';
  });
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
    const total = list.length;
    if (sortable && !st.expanded) list = list.slice(0, 5);
    more.hidden = total <= 5;
    more.textContent = st.expanded ? 'Mostrar apenas Top 5' : `Ver ranking completo · ${total} DJs`;
    more.setAttribute('aria-expanded', String(st.expanded));
    $("tbody", stage).innerHTML = list.map(d => {
      const prev = st.last[d.name], mv = prev && prev !== d.pos ? (prev > d.pos ? `<span class="mv up" aria-label="subiu ${prev - d.pos}">▲${prev - d.pos}</span>` : `<span class="mv dn" aria-label="caiu ${d.pos - prev}">▼${d.pos - prev}</span>`) : "";
      return `<tr data-rank="${d.pos}" class="${d.pos <= 5 ? "z5" : ""}${d.pos === 5 ? " cut" : ""}${d.name === st.flash ? " flash" : ""}">
        <td class="b-pos">${rankAward(d.pos)}<span class="num3d">${pad(d.pos)}</span></td>
        <td class="b-dj l">${d.pos <= 3 ? `<span class="rank-honor">${d.pos === 1 ? 'Líder do ranking' : d.pos + 'º lugar · pódio'}</span>` : ''}<b>${d.name}</b>${mv}<span class="mono">${d.style}</span>${d.pos <= 5 ? `<span class="sr-only">, zona da Final</span>` : ""}</td>
        <td class="b-score"><span class="led">${fmt2(d.nota)}</span><button type="button" class="dj-details" data-dj-details aria-expanded="false" aria-label="Detalhes de ${d.name}">Ver detalhes +</button></td>
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

  // Reutiliza os campos e a validação existentes em quatro etapas.
  const groups = [
    [party.closest('.field')],
    [lineup.closest('fieldset')],
    [$('#vSliders').closest('fieldset'), $('#vComment').closest('.field')],
    [$('#vName').closest('.field.two'), $('#vClubber').closest('label'), $('#vConsent').closest('label'), $('#eConsent'), $('.vote-actions', form)]
  ];
  const titles = ['Em qual festa você esteve?', 'Quem você quer avaliar?', 'Como foi o set?', 'Confira e registre sua avaliação'];
  const progress = document.createElement('div'); progress.className = 'vote-progress';
  progress.innerHTML = '<p class="vote-step-count" aria-live="polite"></p><div class="vote-step-track" aria-hidden="true"><span></span></div><h3 class="vote-step-title" tabindex="-1"></h3><p class="vote-step-summary"></p>';
  $('#voteHelp').after(progress);
  const panels = groups.map((nodes, index) => {
    const panel = document.createElement('div'); panel.className = 'vote-step'; panel.dataset.step = index;
    nodes.forEach(node => panel.append(node)); form.insertBefore(panel, $('#voteMsg')); return panel;
  });
  const nav = document.createElement('div'); nav.className = 'vote-step-nav';
  nav.innerHTML = '<button type="button" class="btn btn-line-light" data-vote-back>Voltar</button><button type="button" class="btn btn-y" data-vote-next>Continuar →</button>';
  form.insertBefore(nav, $('#voteMsg'));
  let step = 0, criterion = 0;
  const criterionTips = ['Mixagem limpa, volume equilibrado e graves bem resolvidos.', 'Transições, escolha de faixas e a história do set.', 'Leitura da pista e conexão com o público.', 'Identidade, repertório e ousadia.'];
  const noteProgress = document.createElement('p'); noteProgress.className = 'note-progress'; $('#vSliders').before(noteProgress);
  CRIT.forEach(([key], index) => {
    const row = $('#row_' + key), range = $('#s_' + key);
    const tip = document.createElement('p'); tip.className = 'criterion-tip'; tip.textContent = criterionTips[index]; range.before(tip);
    const choices = document.createElement('div'); choices.className = 'note-choices';
    for (let n = 0; n <= 10; n++) {
      const choice = document.createElement('button'); choice.type = 'button'; choice.textContent = n; choice.setAttribute('aria-pressed', 'false');
      choice.onclick = () => { range.value = n; touched.add(key); updateAvg(); err('eNotas', ''); [...choices.children].forEach(b => b.setAttribute('aria-pressed', String(b === choice))); };
      choices.append(choice);
    }
    range.hidden = true; row.append(choices);
  });
  const showCriterion = () => {
    CRIT.forEach(([key], index) => $('#row_' + key).hidden = index !== criterion);
    noteProgress.textContent = `Critério ${criterion + 1} de 4`;
    $('#vComment').closest('.field').hidden = criterion !== 3;
  };
  const showStep = (index, focus = true) => {
    step = index; panels.forEach((panel, i) => panel.hidden = i !== step);
    if (step === 2) showCriterion();
    $('.vote-step-count', progress).textContent = `Etapa ${step + 1} de 4`;
    $('.vote-step-track span', progress).style.width = `${(step + 1) * 25}%`;
    $('.vote-step-title', progress).textContent = titles[step];
    $('.vote-step-summary', progress).textContent = step > 1 ? `${PARTIES.find(p => p.id === party.value)?.label || ''} · ${dj || ''}${step === 3 ? ' · Nota ' + $('#vAvg').textContent : ''}` : '';
    $('[data-vote-back]', nav).hidden = step === 0; $('[data-vote-next]', nav).hidden = step === 3;
    $('#voteMsg').textContent = ''; $('#voteMsg').className = 'form-msg';
    if (focus) $('.vote-step-title', progress).focus({preventScroll:true});
  };
  const nextStep = () => {
    if (step === 0 && !party.value) { err('eParty', 'Escolha a festa em que você esteve.'); party.focus(); return; }
    if (step === 1 && !dj) { err('eDj', 'Escolha um DJ para continuar.'); lineup.querySelector('button')?.focus(); return; }
    if (step === 2) {
      if (!touched.has(CRIT[criterion][0])) { err('eNotas', 'Escolha uma nota para continuar.'); $('.note-choices button', $('#row_' + CRIT[criterion][0])).focus(); return; }
      if (criterion < 3) { criterion++; showCriterion(); return; }
    }
    if (step < 3) showStep(step + 1);
  };
  $('[data-vote-back]', nav).onclick = () => { if (step === 2 && criterion > 0) { criterion--; showCriterion(); } else showStep(step - 1); };
  $('[data-vote-next]', nav).onclick = nextStep;
  form.classList.add('vote-wizard'); showStep(0, false);

  form.onsubmit = async e => {
    e.preventDefault(); say("", "");
    if (step < 3) { nextStep(); return; }
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
    const follow = document.createElement('div'); follow.className = 'vote-followup';
    const another = document.createElement('button'); another.type = 'button'; another.className = 'btn btn-line-light'; another.textContent = 'Avaliar outro DJ';
    another.onclick = () => { dj = null; touched.clear(); criterion = 0; renderLineup(); updateAvg(); $$('.note-choices button', form).forEach(b => b.setAttribute('aria-pressed', 'false')); showStep(0); };
    const rankingLink = document.createElement('a'); rankingLink.href = '#t-rank'; rankingLink.textContent = 'Voltar ao ranking'; rankingLink.className = 'link-arrow';
    follow.append(another, rankingLink); $('#voteMsg').append(follow);
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
  done: () => "<b>Interesse salvo neste navegador.</b> Este formulário ainda não envia os dados à equipe. Para conversar sobre a seleção, mande um direct para o @brazilianbayle.",
});
/* Candidatura guiada: mantém os campos e a validação do formulário original. */
(() => {
  const form = $('#applyForm'); if (!form) return;
  const submit = form.onsubmit, button = $('#applyBtn');
  const definitions = [
    ['aName', 'Como você se chama?', () => $('#aName').value.trim().length >= 2, 'Escreva seu nome.'],
    ['aIg', 'Qual é o seu Instagram?', () => igOk($('#aIg').value), 'Use o formato @seu.perfil.'],
    ['aEmail', 'Qual é o seu e-mail?', () => mailOk($('#aEmail').value), 'Confira o e-mail.'],
    ['aCity', 'De onde você vem?'],
    ['aPlan', 'Como quer fazer parte?'],
    ['aWhy', 'Por que quer viver esse baile com a gente?'],
    ['aConsent', 'Podemos concluir?', () => $('#aConsent').checked, 'Confirme que tem 18 anos ou mais e aceite os termos.']
  ];
  const progress = document.createElement('div'); progress.className = 'vote-progress';
  progress.innerHTML = '<p class="vote-step-count" aria-live="polite"></p><div class="vote-step-track" aria-hidden="true"><span></span></div><h3 class="vote-step-title" tabindex="-1"></h3>';
  form.prepend(progress);
  const panels = definitions.map(([id]) => {
    const panel = document.createElement('div'); panel.className = 'apply-step';
    const input = $('#' + id), field = input.closest('.field, .check');
    form.insertBefore(panel, field); panel.append(field);
    if (id === 'aConsent') panel.append($('#eaConsent'));
    if (id === 'aWhy') {
      const note = document.createElement('p'); note.className = 'dim'; note.textContent = 'Opcional. Se preferir, pode continuar sem responder.'; panel.prepend(note);
    }
    return panel;
  });
  const nav = document.createElement('div'); nav.className = 'vote-step-nav';
  nav.innerHTML = '<button class="btn btn-line" type="button" data-apply-back>Voltar</button><button class="btn btn-gold" type="button" data-apply-next>Continuar</button>';
  form.insertBefore(nav, button); nav.append(button);
  const back = $('[data-apply-back]', nav), next = $('[data-apply-next]', nav);
  let step = 0;
  const show = (index, focus = true) => {
    step = index;
    panels.forEach((panel, i) => { panel.hidden = i !== step; });
    $('.vote-step-count', progress).textContent = `Pergunta ${step + 1} de ${panels.length}`;
    $('.vote-step-track span', progress).style.width = `${(step + 1) / panels.length * 100}%`;
    $('.vote-step-title', progress).textContent = definitions[step][1];
    back.hidden = step === 0; next.hidden = step === panels.length - 1; button.hidden = step !== panels.length - 1;
    if (focus) $('.vote-step-title', progress).focus({preventScroll:true});
  };
  const valid = () => {
    const [id, , test, message] = definitions[step];
    const input = $('#' + id), error = input.getAttribute('aria-describedby');
    const ok = !test || test();
    if (error) $('#' + error).textContent = ok ? '' : message;
    input.setAttribute('aria-invalid', String(!ok));
    if (!ok) input.focus();
    return ok;
  };
  const advance = () => { if (valid() && step < panels.length - 1) show(step + 1); };
  next.addEventListener('click', advance);
  back.addEventListener('click', () => show(Math.max(0, step - 1)));
  form.onsubmit = e => {
    e.preventDefault();
    if (step < panels.length - 1) { advance(); return; }
    if (valid()) return submit.call(form, e);
  };
  form.addEventListener('reset', () => setTimeout(() => show(0, false), 0));
  form.classList.add('apply-wizard'); show(0, false);
})();
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
      const average = fmt1(v.s.reduce((sum, n) => sum + n, 0) / v.s.length);
      return `<article class="rev" aria-labelledby="review-${ix}-${lim}">
        <div class="review-heading"><span class="review-category"><span class="review-frequency" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span>Resenha de pista</span><span class="review-example">Demonstração</span></div>
        <p class="review-venue">${v.t.replace(/:$/, '')}</p>
        <h3 id="review-${ix}-${lim}">${v.e}</h3>
        <p class="review-copy">${v.p}</p>
        <div class="review-rating"><span>Nota do set<small>Média dos quatro critérios</small></span><strong>${average}<small>/10</small></strong></div>
        <div class="scores">${CRIT.map(([, l], j) => `<span><span>${l}</span><b>${v.s[j]}</b></span>`).join("")}</div>
        <div class="rev-top"><span class="av" aria-hidden="true">${v.i}</span><div><b>${v.n}</b><span class="mono">BRB Clubber · ${v.f} festas · exemplo</span></div></div>
      </article>`;
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

/* Entradas coordenadas: cada bloco e sua legenda seguem a ordem da seção. */
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
        word.style.setProperty('--word-delay', `${index++ * 170}ms`);
        fragment.append(word);
      });
      node.replaceWith(fragment);
    });
  });
  // Animate complete interactive cards, without staggering hidden form controls.
  const blocks = '.event, .board-stage, .vote-card, .plan, .apply-form, .rev, .drop-form, .how li, .memory-arc, .club-identity, .shop-product';
  const selector = `${blocks}, main h1, main h2, main h3, main p, main figcaption, main .cta-row, main .btn, main .link-arrow, main .manifesto-link, .foot-title`;
  const items = [...document.querySelectorAll(selector)].filter(el =>
    !el.closest('[aria-hidden="true"], .gal-stage, .gal-track, .vote-panel') &&
    !el.parentElement.closest(blocks) &&
    !(el.matches('.btn') && el.closest('.cta-row'))
  );
  const observer = new IntersectionObserver(entries => {
    const visible = entries.filter(entry => entry.isIntersecting)
      .sort((a, b) => items.indexOf(a.target) - items.indexOf(b.target));
    const sectionDelays = new Map();
    visible.forEach(entry => {
      const el = entry.target;
      const section = el.closest('section') || el.closest('main') || el.parentElement;
      const delay = sectionDelays.get(section) || 0;
      el.style.setProperty('--entrance-delay', `${delay}ms`);
      sectionDelays.set(section, Math.min(delay + (el.matches('h1,h2,h3') ? 650 : 340), 1800));
      el.classList.add('entrance-visible', 'words-visible');
      observer.unobserve(el);
    });
  }, { threshold: 0, rootMargin: '0px 0px -24px 0px' });
  items.forEach(el => { el.classList.add('entrance-item'); observer.observe(el); });
  headings.forEach(heading => {
    if (!heading.closest('.entrance-item')) heading.classList.add('words-visible');
  });
})();

/* Busca, categorias e ordenação do catálogo. */
(() => {
  const grid=document.querySelector('.shop-products'); if(!grid)return;
  const products=[...grid.querySelectorAll('.shop-product')];
  const search=document.querySelector('#shopSearch'), sort=document.querySelector('#shopSort');
  let category='Todos';
  const update=()=>{
    const query=search.value.trim().toLocaleLowerCase('pt-BR');
    const ordered=[...products].sort((a,b)=>sort.value==='low'?Number(a.dataset.price)-Number(b.dataset.price):sort.value==='high'?Number(b.dataset.price)-Number(a.dataset.price):sort.value==='name'?a.dataset.name.localeCompare(b.dataset.name,'pt-BR'):products.indexOf(a)-products.indexOf(b));
    let count=0; ordered.forEach(product=>{product.hidden=!((category==='Todos'||product.dataset.category===category)&&product.dataset.name.includes(query));if(!product.hidden)count++;grid.append(product)});
    document.querySelector('#shopCount').textContent=`${count} ${count===1?'peça':'peças'}`;
    document.querySelector('.shop-empty').hidden=count!==0;
  };
  search.addEventListener('input',update);sort.addEventListener('change',update);
  document.querySelectorAll('[data-shop-category]').forEach(link=>link.addEventListener('click',()=>{category=link.dataset.shopCategory;document.querySelectorAll('[data-shop-category]').forEach(a=>a.removeAttribute('aria-current'));link.setAttribute('aria-current','true');update()}));
  const slides=[...document.querySelectorAll('.shop-campaign-slide')];let index=0;
  const show=offset=>{index=(index+offset+slides.length)%slides.length;slides.forEach((slide,i)=>slide.hidden=i!==index);document.querySelector('[data-campaign-count]').textContent=`${String(index+1).padStart(2,'0')} / ${String(slides.length).padStart(2,'0')}`};
  document.querySelector('[data-campaign-prev]')?.addEventListener('click',()=>show(-1));
  document.querySelector('[data-campaign-next]')?.addEventListener('click',()=>show(1));
})();

/* Géométrie responsive de l'arc: mêmes photos, sans dépendance React. */
(() => {
  const arc=document.querySelector('[data-memory-arc]');if(!arc)return;
  const cards=[...arc.querySelectorAll('.memory-card')];let previousWidth=0;
  const layout=()=>{
    const width=arc.clientWidth;if(width===previousWidth)return;previousWidth=width;
    const small=width<600;
    const radius=Math.min(350,width*.32);
    const cardWidth=Math.min(310,width*(small?.34:.29));
    const portraitWidth=cardWidth*.82;
    arc.style.height=`${Math.ceil(radius+portraitWidth*1.2*.55+38)}px`;
    cards.forEach((card,i)=>{
      const angle=(145-(110/(Math.max(cards.length,2)-1))*i)*Math.PI/180;
      card.style.setProperty('--memory-x',`${Math.cos(angle)*radius}px`);
      card.style.setProperty('--memory-y',`${Math.sin(angle)*radius}px`);
      card.style.setProperty('--memory-width',`${card.classList.contains('memory-portrait')?portraitWidth:cardWidth}px`);
      card.style.setProperty('--memory-rotation',`${(i-1)*11}deg`);
      card.style.setProperty('--memory-delay',`${i*140}ms`);
      card.style.setProperty('--memory-layer',String(i===1?3:1));
    });
  };
  layout();if('ResizeObserver' in window)new ResizeObserver(layout).observe(arc);else addEventListener('resize',layout);
  if(!reduced&&'IntersectionObserver' in window){
    arc.dataset.ready='true';
    const io=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){arc.classList.add('is-visible');io.disconnect()}},{threshold:.1});io.observe(arc);
  }else arc.classList.add('is-visible');
})();

/* Fotos com swipe nativo: não captura nem prende a rolagem da página. */
(() => {
  const gallery = document.querySelector('[data-radial-gallery]'); if (!gallery) return;
  const track = gallery.querySelector('.radial-wheel'), items = [...track.children];
  track.tabIndex = 0;
  track.setAttribute('aria-label', 'Fotos da comunidade. Deslize para os lados ou use as setas.');
  const controls = document.createElement('div'); controls.className = 'gallery-controls';
  controls.innerHTML = '<button type="button" class="btn btn-line" data-gallery-prev aria-label="Foto anterior">←</button><span class="mono" data-gallery-count aria-live="polite"></span><button type="button" class="btn btn-line" data-gallery-next aria-label="Próxima foto">→</button>';
  gallery.append(controls);
  const prev = controls.querySelector('[data-gallery-prev]'), next = controls.querySelector('[data-gallery-next]');
  let index = 0, frame = 0;
  const update = () => {
    frame = 0;
    index = items.reduce((best, item, i) => Math.abs(item.offsetLeft - items[0].offsetLeft - track.scrollLeft) < Math.abs(items[best].offsetLeft - items[0].offsetLeft - track.scrollLeft) ? i : best, 0);
    controls.querySelector('[data-gallery-count]').textContent = `${String(index + 1).padStart(2,'0')} / ${String(items.length).padStart(2,'0')}`;
    prev.disabled = track.scrollLeft < 2;
    next.disabled = track.scrollLeft >= track.scrollWidth - track.clientWidth - 2;
  };
  const move = direction => {
    const target = items[Math.max(0,Math.min(items.length - 1,index + direction))];
    track.scrollTo({left:target.offsetLeft-items[0].offsetLeft,behavior:reduced?'instant':'smooth'});
  };
  prev.addEventListener('click',()=>move(-1));next.addEventListener('click',()=>move(1));
  track.addEventListener('keydown',event=>{
    if(event.target!==track || !['ArrowLeft','ArrowRight'].includes(event.key))return;
    event.preventDefault();move(event.key==='ArrowRight'?1:-1);
  });
  track.addEventListener('scroll',()=>{if(!frame)frame=requestAnimationFrame(update)},{passive:true});
  if('ResizeObserver' in window)new ResizeObserver(update).observe(track);
  update();
})();

/* Les deux faces du Clubber entrent séparément. */
(() => {
  const cards = document.querySelectorAll('.club-identity figure');
  if(reduced || !('IntersectionObserver' in window))return;
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
    if(entry.isIntersecting){entry.target.classList.add('card-entered');observer.unobserve(entry.target)}
  }),{threshold:.15});
  cards.forEach((card,i)=>{card.classList.add('card-enter');card.style.setProperty('--card-delay',`${i%2*450}ms`);observer.observe(card)});
})();
