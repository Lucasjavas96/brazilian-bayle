/* Brazilian Bayle · avaliações válidas e dados pessoais protegidos no backend. */

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const fmt2 = n => n == null ? "—" : n.toFixed(2).replace(".", ",");
const fmt1 = n => n == null ? "—" : n.toFixed(1).replace(".", ",");
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d } catch { return d } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} }
};
function rnd(seed) { return () => (seed = (seed * 16807) % 2147483647, (seed - 1) / 2147483646) }
const slug = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const initials = s => s.replace(/[^A-Za-zÀ-ÿ ]/g, "").split(/\s+/).filter(Boolean).map(w => w[0]).join("").slice(0, 2).toUpperCase();
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
  const t = ["After do Solomun · 31.10", "BRB Clubbers", "O melhor network de música eletrônica do Brasil", "Só DJs brasileiros",
    "Os 5 melhores tocam na Final", "Avalie a performance dos DJs", "A pista é brasileira e sempre vai ser"];
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
  const AFTER = new Date("2026-10-31T23:59:00-03:00").getTime();
  const tick = () => {
    let s = Math.max(0, Math.floor((AFTER - Date.now()) / 1000));
    const d = Math.floor(s / 86400); s -= d * 86400; const h = Math.floor(s / 3600); s -= h * 3600; const m = Math.floor(s / 60); s -= m * 60;
    [["#cdD", d], ["#cdH", h], ["#cdM", m], ["#cdS", s]].forEach(([id, n]) => $(id).textContent = String(n).padStart(2, "0"));
  };
  tick(); setInterval(tick, 1000);
})();

/* ---------- critérios e catálogo de DJs ---------- */
const CRIT = [
  ["som", "Qualidade do Som"],
  ["harmonia", "Harmonia do Set"],
  ["energia", "Vibe"],
  ["sofisticacao", "Sofisticação"],
];
const DJS = [
  ["Alok","House"],["Vintage Culture","House"],["Mochakk","Tech house"],["ANNA","Techno"],["Liu","Bass house"],
  ["Cat Dealers","Brazilian bass"],["Dubdogz","Brazilian bass"],["KVSH","Brazilian bass"],["Bhaskar","House"],["Chemical Surf","Brazilian bass"],
  ["Zerb","Afro house"],["Öwnboss","Bass house"],["RUBACK","Tech house"],["Victor Ruiz","Techno"],["Gui Boratto","Techno"],
  ["Illusionize","Tech house"],["Beltran","Tech house"],["Mojjo","House"],["Classmatic","Tech house"],["GREG","House"],
  ["Fancy Inc","Brazilian bass"],["Felguk","Electro house"],["Antdot","Afro house"],["Rooftime","Tech house"],["Binaryh","Melodic techno"],
  ["Elekfantz","Indie dance"],["L_cio","House"],["Patife","Drum & bass"],["Leo Janeiro","House"],["Breaking Beattz","Bass house"],
  ["Gabe","House"],["JetLag Music","House"],["Shapeless","Techno"],["Eli Iwasa","Techno"],["Bruno Be","House"],
  ["Mau Mau","House"],["Sevek","Brazilian bass"],["Bruno Martini","Brazilian bass"],["Victor Lou","Tech house"],["Pontifexx","Brazilian bass"],
  ["Wehbba","Techno"],["Selvagem","Disco"],["Tropkillaz","Trap"],["DJ Marky","Drum & bass"],["Anderson Noise","Techno"],
  ["Groove Delight","Tech house"],["Renato Ratier","Techno"],["Mila Journée","Melodic house"],["Ney Faustini","House"],["Renato Cohen","Techno"],
  ["Vinne","Bass house"],["Volkoder","Bass house"],["Dashdot","Deep house"],["Maz","Afro house"],["Malifoo","Brazilian bass"],
  ["Greggio","Tech house"],["GenX","Música eletrônica"]];
let officialRows = [];
const MIN_VOTES = 30;
const djNote = d => d.unrated ? "Sem avaliações" : d.emAvaliacao ? `Em avaliação · ${d.votos}/${MIN_VOTES} avaliadores` : `Média ${fmt2(d.m)} · ${d.votos.toLocaleString("pt-BR")} avaliadores · ${d.venue_name ? "Local: " + d.venue_name : "Sem local validado"}`;
const scoreCell = d => Number.isFinite(d.pos) ? fmt2(d.nota) : "Em avaliação";
function table() {
 const rated=new Set(officialRows.map(row=>row.name));
 return [...officialRows.map(row=>({...row})),...DJS.filter(([name])=>!rated.has(name)).map(([name,style])=>({name,style,pos:Infinity,nota:null,som:null,harmonia:null,energia:null,sofisticacao:null,votos:0,festas:0,unrated:true}))];
}
const meter = v => { const full = Math.floor(v), half = v - full >= .5; return `<span class="meter" aria-hidden="true">${Array.from({ length: 10 }, (_, i) => `<i class="${i < full ? "on" : i === full && half ? "half" : ""}"></i>`).join("")}</span>` };
const pad = n => Number.isFinite(n) ? String(n).padStart(2, "0") : "—";

/* ---------- pódio ---------- */
function rankAward(position) {
  if (position > 3) return '';
  const label = position === 1 ? 'Coroa do primeiro colocado' : `Medalha de ${position === 2 ? 'prata' : 'bronze'}`;
  const shape = position === 1
    ? '<path d="M3 7l5 4 4-7 4 7 5-4-2 12H5L3 7z"/><path d="M6 22h12" fill="none" stroke="currentColor" stroke-width="2"/>'
    : '<path d="M6 2h5l2 7-5 2-2-9zm12 0h-5l-2 7 5 2 2-9z" opacity=".65"/><circle cx="12" cy="15" r="7"/><circle cx="12" cy="15" r="5" fill="none" stroke="#000" stroke-opacity=".3"/><text x="12" y="18" text-anchor="middle" fill="#141414" font-size="9" font-family="sans-serif" font-weight="700">' + position + '</text>';
  return `<svg class="rank-award" viewBox="0 0 24 24" role="img" aria-label="${label}" fill="currentColor">${shape}</svg>`;
}
function podiumCard(pos, name, style, note, label) {
  return `<div class="pod pc p${pos}" style="--c:var(--pc${pos})">
    <div class="pc-score"><span class="pc-n" aria-label="${label}">${note}</span></div>
    <div class="pc-ph"><img src="/assets/djs/${slug(name)}.webp" alt="${name}" width="500" height="500" loading="lazy" decoding="async"><p class="pc-wm"><b>Brazilian <em>Bayle</em></b></p><img class="pc-papa" src="/assets/papagaio-bayle.png" alt="" width="96" height="192" loading="lazy" decoding="async"></div>
    <div class="pc-t"><p class="pc-name"><a href="/djpedia/${slug(name)}">${name}</a></p><p class="pc-st mono">${pos}º lugar · ${style}</p></div>
  </div>`;
}
function renderPodium() {
  const el = $("[data-podium]"); if (!el) return;
  el.hidden = false;
  const official=officialRows.filter(d=>!d.emAvaliacao);
  if(!official.length){
   el.setAttribute('aria-label','DJs aguardando avaliações');
   el.innerHTML = DJS.slice(0,3).map(([name,style],index)=>podiumCard(index+1,name,style,"—","Em avaliação")).join("");return;
  }
  el.setAttribute('aria-label','Os três primeiros da classificação');
  el.innerHTML = official.slice(0, 3).map(d => podiumCard(d.pos, d.name, d.style, fmt2(d.nota), "nota " + fmt2(d.nota))).join("");
}

/* ---------- tabela ---------- */
const boards = [];
function mountBoard(stage) {
  const limit = +stage.dataset.limit || 0, sortable = stage.hasAttribute("data-sortable");
  const st = { sort: "nota", last: {}, flash: null, expanded: false };
  stage.classList.add('board-summary');
  const head = [["nota", "Nota"], ...CRIT, ["votos", "Votos"]];
  stage.innerHTML = `<table class="board">
    <caption class="sr-only">Brasileirão dos DJs, classificação por avaliações válidas${limit ? `, ${limit} primeiros` : ""}</caption>
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
  if (sortable) $("thead", stage).onclick = e => {
    const b = e.target.closest("button[data-sort]"); if (!b) return; st.sort = b.dataset.sort;
    $$("th[data-k]", stage).forEach(th => th.dataset.k === st.sort ? th.setAttribute("aria-sort", "descending") : th.removeAttribute("aria-sort")); render();
  };
  function render() {
    const rows = table();
    let list = el.hasAttribute("data-limit") ? rows.slice(0,Number(el.dataset.limit)) : rows;
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
        <td class="b-dj l">${d.pos <= 3 ? `<span class="rank-honor">${d.pos === 1 ? 'Líder do ranking' : d.pos + 'º lugar · pódio'}</span>` : ''}<a class="b-name" href="/djpedia/${slug(d.name)}"><b>${d.name}</b></a>${mv}<span class="mono">${d.style}</span><span class="mono dj-meta">${djNote(d)}</span>${d.pos <= 5 ? `<span class="sr-only">, zona da Final</span>` : ""}</td>
        <td class="b-score"><span class="led${Number.isFinite(d.pos) ? "" : " led-wait"}">${scoreCell(d)}</span><button type="button" class="dj-details" data-dj-details aria-expanded="false" aria-label="Detalhes de ${d.name}">Ver detalhes +</button></td>
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
  const NATIONAL = new Set(DJS.map(d => d[0]));
  const PARTIES = (window.BRB_EVENTS || []).map(event => ({id:event.id,date:event.date,label:`${event.venue} · ${event.date.slice(8)}/${event.date.slice(5,7)}/${event.date.slice(0,4)} · ${event.name}`,dj:event.lineup.filter(name=>NATIONAL.has(name))})).filter(event=>event.dj.length);
  let dj = null; const touched = new Set();
  const party = $("#vParty"), lineup = $("#vLineup");
  // clube primeiro; a lista de festas é a mesma do Spotted. Só dá para avaliar festa que já aconteceu e tenha DJ do ranking.
  const EVENTS = window.BRB_EVENTS || [];
  const CLUBS = [...new Set(EVENTS.map(e => e.venue))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
  const clubSel = $('#vClub'), today = new Date().toLocaleDateString('sv-SE',{timeZone:'America/Sao_Paulo'});
  clubSel.replaceChildren(new Option('Escolha o clube',''), ...CLUBS.map(c=>new Option(c,c)));
  const fillParties = () => {
    const events = EVENTS.filter(e=>e.venue===clubSel.value);
    party.disabled = !events.length;
    party.replaceChildren(new Option(events.length ? 'Escolha a festa' : 'Escolha primeiro o clube',''), ...events.map(e=>{
      const eligible=PARTIES.find(p=>p.id===e.id), future=e.date>today;
      const label=`${e.date.slice(8)}/${e.date.slice(5,7)} · ${e.name}`+(future?' (ainda não aconteceu)':!eligible?' (sem apresentação brasileira confirmada)':'');
      const option=new Option(label,e.id);option.disabled=future||!eligible;return option;
    }));
    $('#vPartyCount').textContent=events.length ? `${events.length} festas cadastradas. Avaliações disponíveis para apresentações brasileiras confirmadas e já realizadas.` : 'Escolha o clube para ver as festas.';
    dj=null;renderLineup();
  };
  const renderLineup = () => {
    const p = PARTIES.find(x => x.id === party.value);
    lineup.innerHTML = p ? p.dj.map(n => `<button type="button" aria-pressed="${n === dj}" data-dj="${n}">${n}</button>`).join("") : `<span class="hint">Escolha a festa primeiro.</span>`;
  };
  party.onchange = () => { dj = null; renderLineup(); err("eParty", "") };
  clubSel.onchange = () => { fillParties(); err("eParty", ""); };
  const partySearch = $('#vPartySearch');
  if (partySearch) {
    const filterParties = () => {
      const query = slug(partySearch.value).replaceAll('-',' ');
      const matches = PARTIES.filter(p => query.split(' ').every(word => slug(p.label+' '+p.dj.join(' ')).replaceAll('-',' ').includes(word)));
      const selected = party.value;
      party.replaceChildren(new Option(matches.length ? 'Escolha a festa' : 'Nenhuma festa encontrada',''), ...matches.map(p => new Option(p.label,p.id)));
      party.value = matches.some(p => p.id === selected) ? selected : '';
      if (selected !== party.value) party.onchange();
      $('#vPartyCount').textContent = `${matches.length} festa${matches.length === 1 ? '' : 's'} encontrada${matches.length === 1 ? '' : 's'}`;
    };
    partySearch.addEventListener('input',filterParties);
    filterParties();
  }
  fillParties();
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
  const voteAccount = $('#voteAccount');
  const updateVoteAccount = async () => {
    const {data} = await BRB.auth.getSession();
    if(!data.session){voteAccount.textContent='Entre na sua conta para registrar sua avaliação.';return;}
    try{const profile=await BRB.rpc('profile_get');voteAccount.textContent=profile?.nick ? 'Avaliando como @'+profile.nick : 'Sua avaliação será vinculada à sua conta.';}
    catch{voteAccount.textContent='Confirme seu acesso na página da conta antes de avaliar.';}
  };
  BRB.auth.onAuthStateChange(()=>setTimeout(updateVoteAccount,0));updateVoteAccount();

  // Reutiliza os campos e a validação existentes em quatro etapas.
  const groups = [
    [party.closest('.field')],
    [lineup.closest('fieldset')],
    [$('#vSliders').closest('fieldset'), $('#vComment').closest('.field')],
    [$('#voteIdentity'), $('#vConsent').closest('label'), $('#eConsent'), $('.vote-actions', form)]
  ];
  const titles = ['Em qual clube e festa você esteve?', 'Quem você quer avaliar?', 'Como foi o set?', 'Confira e registre sua avaliação'];
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
    const fader = document.createElement('div'); fader.className = 'fader untouched'; fader.tabIndex = 0;
    fader.setAttribute('role', 'slider'); fader.setAttribute('aria-label', CRIT[index][1]); fader.setAttribute('aria-valuemin', '0'); fader.setAttribute('aria-valuemax', '10'); fader.setAttribute('aria-valuenow', '0'); fader.setAttribute('aria-valuetext', 'Não avaliado'); fader.setAttribute('aria-orientation', 'vertical');
    fader.innerHTML = '<div class="fader-scale" aria-hidden="true">' + [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0].map(n => '<span>' + n + '</span>').join('') + '</div><div class="fader-rail" aria-hidden="true"><i class="fader-fill"></i><b class="fader-cap"></b></div><output class="fader-val" aria-hidden="true">—</output><p class="fader-hint">Arraste para cima ou para baixo</p>';
    const rail = $('.fader-rail', fader), fill = $('.fader-fill', fader), cap = $('.fader-cap', fader), val = $('.fader-val', fader);
    const paintFader = v => {
      const pct = v * 10;
      fill.style.height = pct + '%'; cap.style.bottom = pct + '%';
      val.textContent = touched.has(key) ? fmt1(v) : '—';
      fader.classList.toggle('untouched', !touched.has(key));
      fader.setAttribute('aria-valuenow', String(v)); fader.setAttribute('aria-valuetext', touched.has(key) ? fmt1(v) + ' de 10' : 'Não avaliado');
    };
    const setFader = v => { v = Math.max(0, Math.min(10, Math.round(v * 2) / 2)); range.value = v; touched.add(key); paintFader(v); updateAvg(); err('eNotas', ''); };
    const fromPointer = e => { const r = rail.getBoundingClientRect(); setFader((1 - (e.clientY - r.top) / r.height) * 10); };
    let drag = false;
    fader.addEventListener('pointerdown', e => { drag = true; try { fader.setPointerCapture(e.pointerId); } catch {} fromPointer(e); e.preventDefault(); });
    fader.addEventListener('pointermove', e => { if (drag) fromPointer(e); });
    const stop = () => { drag = false; }; fader.addEventListener('pointerup', stop); fader.addEventListener('pointercancel', stop);
    fader.addEventListener('keydown', e => {
      const cur = touched.has(key) ? +range.value : 0, step = { ArrowUp: .5, ArrowRight: .5, ArrowDown: -.5, ArrowLeft: -.5, PageUp: 1, PageDown: -1 }[e.key];
      if (step !== undefined) { e.preventDefault(); setFader(cur + step); } else if (e.key === 'Home') { e.preventDefault(); setFader(0); } else if (e.key === 'End') { e.preventDefault(); setFader(10); }
    });
    fader.reset = () => { touched.delete(key); range.value = 5; paintFader(0); };
    paintFader(0);
    range.hidden = true; row.append(fader);
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
    if (step === 0 && !clubSel.value) { err('eParty', 'Escolha o clube em que você esteve.'); clubSel.focus(); return; }
    if (step === 0 && !party.value) { err('eParty', 'Escolha a festa em que você esteve.'); party.focus(); return; }
    if (step === 1 && !dj) { err('eDj', 'Escolha um DJ para continuar.'); lineup.querySelector('button')?.focus(); return; }
    if (step === 2) {
      if (!touched.has(CRIT[criterion][0])) { err('eNotas', 'Escolha uma nota para continuar.'); $('.fader', $('#row_' + CRIT[criterion][0])).focus(); return; }
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
    const {data:sessionData}=await BRB.auth.getSession();
    if(!sessionData.session){location.assign('/conta?next='+encodeURIComponent('/ranking#votar'));return;}
    let first = null; const bad = (id, t, el) => { err(id, t); if (t && !first) first = el };
    bad("eParty", party.value ? "" : "Escolha a festa em que você esteve.", party);
    bad("eDj", dj || !party.value ? "" : "Escolha o DJ que você quer avaliar.", lineup.querySelector("button"));
    bad("eNotas", touched.size === 4 ? "" : `Dê nota nos 4 critérios. Faltam ${4 - touched.size}.`, $(`#s_${CRIT.find(([k]) => !touched.has(k))?.[0] || "som"}`));
    bad("eConsent", $("#vConsent").checked ? "" : "Para votar, aceite a política de privacidade.", $("#vConsent"));
    if (first) { say("err", "Confira os campos marcados acima."); first.focus(); return }
    const btn = $("#voteBtn"); btn.disabled = true; btn.classList.add("loading"); btn.setAttribute("aria-busy", "true");
    const notas = {}; CRIT.forEach(([k]) => notas[k] = +$("#s_" + k).value);
    try {
      await BRB.rpc('vote', { party: party.value, dj, notas, comment: $('#vComment').value.trim(), consent: $('#vConsent').checked });
    } catch (error) {
      say('err', 'Não foi possível registrar: ' + error.message);
      return;
    } finally { btn.classList.remove('loading'); btn.removeAttribute('aria-busy'); btn.disabled = false; }
    say('ok', '<b>Avaliação recebida.</b> Ela já entrou no cálculo do ranking.');
    toast('Avaliação enviada com sucesso.');
    await refreshOfficialRanking();
    $("#vComment").value = "";
    const follow = document.createElement('div'); follow.className = 'vote-followup';
    const another = document.createElement('button'); another.type = 'button'; another.className = 'btn btn-line-light'; another.textContent = 'Avaliar outro DJ';
    another.onclick = () => { dj = null; touched.clear(); criterion = 0; renderLineup(); updateAvg(); $$('.fader', form).forEach(f => f.reset()); showStep(0); };
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
    b.disabled = true;
    try {
      const data = {}; for (const [k, v] of new FormData(f)) data[k] = k in data ? [].concat(data[k], v) : v;
      data.consent = key === 'bb_apps' ? $('#aConsent').checked : $('#dConsent').checked;
      await BRB.rpc(key === 'bb_apps' ? 'application' : 'waitlist', data);
      m.className = 'form-msg ok'; m.innerHTML = done(data); f.reset(); f.dispatchEvent(new Event('input'));
    } catch (error) { m.className = 'form-msg err'; m.textContent = 'Não foi possível enviar: ' + error.message; }
    finally { b.disabled = false; b.classList.remove('loading'); b.removeAttribute('aria-busy'); }

  };
}
const igOk = v => /^@?[a-z0-9._]{2,30}$/i.test(v.trim());
const mailOk = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
const phoneOk = v => { const d = v.replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, ''); return /^\d{10,11}$/.test(d) && /^[1-9]{2}/.test(d); };
simpleForm({
  form: "#applyForm", btn: "#applyBtn", msg: "#applyMsg", key: "bb_apps",
  checks: () => [
    ["eaName", () => $("#aName").value.trim().length >= 2, "Escreva seu nome.", "#aName"],
    ["eaIg", () => igOk($("#aIg").value), "Use o formato @seu.perfil.", "#aIg"],
    ["eaEmail", () => mailOk($("#aEmail").value), "Confira o e-mail.", "#aEmail"],
    ["eaPhone", () => phoneOk($("#aPhone").value), "Informe o celular com DDD.", "#aPhone"],
    ["eaConsent", () => $("#aConsent").checked, "Confirme que tem 18 anos ou mais e aceite os termos.", "#aConsent"],
  ],
  done: () => "<b>Candidatura recebida.</b> Seus dados foram enviados à equipe para análise. Cada e-mail só pode se candidatar uma vez. A seleção não garante aprovação automática.",
});
/* Candidatura guiada: mantém os campos e a validação do formulário original. */
(() => {
  const form = $('#applyForm'); if (!form) return;
  const submit = form.onsubmit, button = $('#applyBtn');
  const definitions = [
    ['aName', 'Como você se chama?', () => $('#aName').value.trim().length >= 2, 'Escreva seu nome.'],
    ['aIg', 'Qual é o seu Instagram?', () => igOk($('#aIg').value), 'Use o formato @seu.perfil.'],
    ['aEmail', 'Qual é o seu e-mail?', () => mailOk($('#aEmail').value), 'Confira o e-mail.'],
    ['aPhone', 'Qual é o seu celular?', () => phoneOk($('#aPhone').value), 'Informe o celular com DDD.'],
    ['aCity', 'De onde você vem?', () => !!$('#aState').value && $('#aCityName').value.trim().length >= 2, 'Escolha o estado e escreva a cidade.'],
    ['aPlan', 'Por que quer fazer parte?', () => $$('#aPlan input:checked').length > 0, 'Marque pelo menos uma opção.'],
    ['aConsent', 'Podemos concluir?', () => $('#aConsent').checked, 'Confirme que tem 18 anos ou mais e aceite os termos.']
  ];
  // cidade = "Cidade - UF" no campo que o servidor já conhece
  const syncCity = () => { const c = $('#aCityName').value.trim(), u = $('#aState').value; $('#aCity').value = c && u ? c + ' - ' + u : ''; };
  $('#aCityName').addEventListener('input', syncCity); $('#aState').addEventListener('change', syncCity);
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
    if (!ok) (input.matches('fieldset') ? $('input', input) : input).focus();
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
  done: () => "<b>Você está na lista.</b> Seu interesse foi enviado à equipe. Acompanhe também o @brazilianbayle para as novidades do drop.",
});
(() => { const ig = $("#aIg"), cc = $("#ccIg"); if (!ig || !cc) return; ig.addEventListener("input", () => cc.textContent = ig.value ? "@" + ig.value.replace(/^@/, "").toUpperCase() : "@SEU.PERFIL") })();

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
  if (reduced || document.body.classList.contains('page-conta') || !('IntersectionObserver' in window)) return;
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

/* Les deux faces du Clubber entrent séparément. */
(() => {
  const cards = document.querySelectorAll('.club-identity figure');
  if(reduced || !('IntersectionObserver' in window))return;
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
    if(entry.isIntersecting){entry.target.classList.add('card-entered');observer.unobserve(entry.target)}
  }),{threshold:.15});
  cards.forEach((card,i)=>{card.classList.add('card-enter');card.style.setProperty('--card-delay',`${i%2*450}ms`);observer.observe(card)});
})();

/* ---------- tabela no formato do Brasileirão (referência: ge.globo) ---------- */
const GE_EXTRA = (() => { const r = rnd(7); return Object.fromEntries(DJS.map(([n]) => [n, { festas: 6 + Math.floor(r() * 12) }])) })();
function mountGe(el) {
  const sortable = el.hasAttribute("data-sortable");
  const st = { sort: "nota", last: {} };
  const cols = [["nota", "Nota", "Nota geral"], ["votos", "Votos", "Votos"], ["festas", "Festas", "Festas avaliadas"],
    ...CRIT.map(([k, l]) => [k, l, l])];
  el.innerHTML = `<div class="ge-card">
    <div class="ge-scroll" tabindex="0" role="region" aria-label="Tabela de classificação, deslize para ver todas as colunas">
    <table class="ge">
      <caption class="sr-only">Brasileirão dos DJs, classificação da classificação por avaliações válidas</caption>
      <thead><tr>
        <th scope="col" class="ge-c-pos" colspan="2">Classificação</th>
        ${cols.map(([k, ab, full]) => `<th scope="col" data-k="${k}" title="${full}"${k === "nota" ? ' aria-sort="descending"' : ""}>${sortable ? `<button type="button" data-sort="${k}">${ab}</button>` : ab}</th>`).join("")}
              </tr></thead>
      <tbody></tbody>
    </table></div>
    <div class="ge-legend">
      <span><i class="ge-zone"></i>Zona da Final · 1º ao 5º</span>
    </div></div>`;
  if (sortable) $("thead", el).onclick = e => {
    const b = e.target.closest("button[data-sort]"); if (!b) return; st.sort = b.dataset.sort;
    $$("th[data-k]", el).forEach(th => th.dataset.k === st.sort ? th.setAttribute("aria-sort", "descending") : th.removeAttribute("aria-sort")); render();
  };
  function render(flash) {
    const rows = table();
    let list = el.hasAttribute("data-limit") ? rows.slice(0,Number(el.dataset.limit)) : rows;
    if (st.sort !== "nota") list = [...list].sort((a, b) => b[st.sort] - a[st.sort]);
    $("tbody", el).innerHTML = list.map(d => {
      const prev = st.last[d.name];
      const mv = prev && prev !== d.pos ? (prev > d.pos ? `<span class="ge-mv up" aria-label="subiu ${prev - d.pos}">▲</span>` : `<span class="ge-mv dn" aria-label="caiu ${d.pos - prev}">▼</span>`) : `<span class="ge-mv" aria-hidden="true">•</span>`;
      const s = slug(d.name), href = `/djpedia/${s}`;
      return `<tr class="${d.pos <= 5 ? "zf" : ""}${d.pos === 5 ? " cut" : ""}${d.name === flash ? " flash" : ""}">
        <td class="ge-pos"><b>${Number.isFinite(d.pos)?d.pos:"—"}</b>${mv}</td>
        <th scope="row" class="ge-dj"><a href="${href}"><img class="ge-badge ge-portrait" src="/assets/djs/thumbs/${s}.webp" alt="" width="32" height="32" loading="lazy" decoding="async"><span class="ge-name">${d.name}</span><span class="ge-style">${d.style} · ${djNote(d)}</span></a>${d.pos <= 5 ? '<span class="sr-only">, zona da Final</span>' : ""}</th>
        <td class="ge-nota${Number.isFinite(d.pos) ? "" : " ge-wait"}">${scoreCell(d)}</td>
        <td>${d.votos.toLocaleString("pt-BR")}</td><td>${d.festas}</td>
        ${CRIT.map(([k]) => `<td>${fmt1(d[k])}</td>`).join("")}</tr>`;
    }).join("");
    rows.forEach(d => st.last[d.name] = d.pos);
  }
  render();
  boards.push({ render: () => render(), flash: n => render(n) });
}
$$("[data-ge-table]").forEach(mountGe);

/* ---------- Manifesto: cada bloco aparece ao rolar ---------- */
(() => {
  const blocks = $$(".mf-b"); if (!blocks.length || reduced || !("IntersectionObserver" in window)) return;
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target) } }), { threshold: .25 });
  blocks.forEach((b, i) => { if (i) { b.classList.add("rv"); io.observe(b) } });
})();

/* ---------- links pendentes (ingresso do after e da festa): preencha quando chegarem ---------- */
const LINKS = { afterGateway: "", festaGateway: "" };
$$("[data-link]").forEach(a => {
  const url = LINKS[a.dataset.link];
  if (url) { a.href = url; a.target = "_blank"; a.rel = "noopener"; return }
  a.setAttribute("aria-disabled", "true");
  a.addEventListener("click", e => { e.preventDefault(); toast("O link de ingresso sai em breve no @brazilianbayle.") });
});

/* Search the encyclopedia without changing its genre organization. */
(() => {
 const input = document.querySelector('#wikiSearch');
 if (!input) return;
 const groups = [...document.querySelectorAll('.wiki-genre')];
 const filter = () => {
  const words = slug(input.value).split('-').filter(Boolean);
  let count = 0;
  groups.forEach(group => {
   let visible = 0;
   group.querySelectorAll('li').forEach(item => {
    item.hidden = !words.every(word => slug(item.textContent).includes(word));
    if (!item.hidden) { visible++; count++; }
   });
   group.hidden = visible === 0;
   const link = document.querySelector('.az-genres a[href="#'+group.id+'"]');
   if (link) link.hidden = group.hidden;
  });
  document.querySelector('#wikiCount').textContent = count ? `${count} DJs encontrados` : 'Nenhum DJ encontrado. Tente outro nome ou gênero.';
 };
 input.addEventListener('input',filter); filter();
})();

/* Public ranking contains only approved, confirmed-account evaluations. */
async function refreshOfficialRanking(){
 if(!document.querySelector('[data-board],[data-ge-table],[data-podium]'))return;
 let note=document.getElementById('rankingLoadStatus');if(!note)note=document.createElement('p');note.className='hint';note.id='rankingLoadStatus';note.setAttribute('role','status');note.textContent='Carregando avaliações válidas…';document.querySelector('[data-podium],[data-board],[data-ge-table]').before(note);
 try{
  const result=await fetch(BRB_CONFIG.url+'/rest/v1/rpc/brb_ranking',{method:'POST',headers:{apikey:BRB_CONFIG.publishableKey,'Content-Type':'application/json'},body:'{}'});
  if(!result.ok)throw Error('ranking');
  const rows=await result.json();officialRows=rows.map(row=>({...row,pos:row.eligible&&row.pos!=null?row.pos:Infinity,emAvaliacao:!row.eligible,style:DJS.find(d=>d[0]===row.name)?.[1]||'Eletrônica'}));
  boards.forEach(board=>board.render());renderPodium();note.textContent=rows.length?'Ranking atualizado com avaliações válidas.':'Ainda não há avaliações. Seja uma das primeiras pessoas a avaliar uma apresentação.';
 }catch{note.textContent='Não foi possível carregar o ranking agora. Tente novamente mais tarde.';}
}
refreshOfficialRanking();
