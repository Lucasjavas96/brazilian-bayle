/* Brazilian Bayle · release 1
   Tudo aqui roda no navegador com dados de demonstração.
   Na próxima etapa, votos, candidaturas e sacola passam a ir para um banco de dados. */

const $ = s => document.querySelector(s);
const fmt = n => n.toFixed(2).replace(".", ",");
const fmt1 = n => n.toFixed(1).replace(".", ",");
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d } catch { return d } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} }
};
function rnd(seed) { return () => (seed = (seed * 16807) % 2147483647, (seed - 1) / 2147483646) }

/* ---------- faixa ---------- */
const tick = ["After do Solomun · 31.10 · local privado", "BRB Clubbers · R$15/mês", "Temporada 2026 · Carnaval a Carnaval",
  "Só DJs brasileiros", "Os 5 melhores tocam na Final", "Vote e comente a sua festa", "É baile fio"];
$("#ticker").innerHTML = [...tick, ...tick].map(t => `<span>${t}</span>`).join("");

/* ---------- menu mobile ---------- */
$("#burger").onclick = () => { $("#burger").classList.toggle("on"); $("#navLinks").classList.toggle("on") };
document.querySelectorAll("#navLinks a").forEach(a => a.onclick = () => { $("#burger").classList.remove("on"); $("#navLinks").classList.remove("on") });

/* ---------- contagem regressiva ---------- */
const AFTER = new Date("2026-10-31T23:00:00-03:00").getTime();
function countdown() {
  let s = Math.max(0, Math.floor((AFTER - Date.now()) / 1000));
  const d = Math.floor(s / 86400); s -= d * 86400;
  const h = Math.floor(s / 3600); s -= h * 3600;
  const m = Math.floor(s / 60); s -= m * 60;
  [["#cdD", d], ["#cdH", h], ["#cdM", m], ["#cdS", s]].forEach(([id, v]) => $(id).textContent = String(v).padStart(2, "0"));
}
countdown(); setInterval(countdown, 1000);

/* ---------- DJs e ranking ---------- */
const CRIT = [["som", "Som"], ["harmonia", "Harmonia"], ["energia", "Energia"], ["sofisticacao", "Sofisticação"]];
const DJS = [["Alok","House"],["Vintage Culture","House"],["Mochakk","Tech house"],["ANNA","Techno"],["Liu","Bass house"],
  ["Cat Dealers","Brazilian bass"],["Dubdogz","Brazilian bass"],["KVSH","Brazilian bass"],["Bhaskar","House"],["Chemical Surf","Brazilian bass"],
  ["Zerb","Afro house"],["Öwnboss","Bass house"],["RUBACK","Tech house"],["Victor Ruiz","Techno"],["Gui Boratto","Techno"],
  ["Illusionize","Tech house"],["Beltran","Tech house"],["Mojjo","House"],["Classmatic","Tech house"],["GREG","House"]];

// base de demonstração: soma ponderada por critério + peso total
const r = rnd(42);
let base = 9.24;
const seed = DJS.map(([name, style]) => {
  const n = base; base -= .05 + r() * .07;
  const votos = Math.floor((6 + r() * 12) * (55 + r() * 45));
  const w = votos * 1.4; // parte dos votos é de Clubbers (peso 3)
  const sums = {}; CRIT.forEach(([k]) => sums[k] = Math.min(9.9, n + (r() - .5) * .7) * w);
  return { name, style, votos, w, sums };
});

function table() {
  const extra = store.get("bb_votes", []);
  const rows = seed.map(d => ({ ...d, sums: { ...d.sums } }));
  extra.forEach(v => {
    const d = rows.find(x => x.name === v.dj); if (!d) return;
    const w = v.clubber ? 3 : 1;
    d.votos++; d.w += w; CRIT.forEach(([k]) => d.sums[k] += v.notas[k] * w);
  });
  rows.forEach(d => { CRIT.forEach(([k]) => d[k] = d.sums[k] / d.w); d.nota = CRIT.reduce((a, [k]) => a + d[k], 0) / 4 });
  rows.sort((a, b) => b.nota - a.nota).forEach((d, i) => d.pos = i + 1);
  return rows;
}

let sortKey = "nota", styleFilter = "Todos", lastPos = {}, flashName = null;
const styles = ["Todos", ...new Set(DJS.map(d => d[1]))];
$("#rankFilters").innerHTML = styles.map(s => `<button class="chip${s === "Todos" ? " on" : ""}" data-s="${s}">${s}</button>`).join("");
$("#rankFilters").onclick = e => { const b = e.target.closest(".chip"); if (!b) return;
  styleFilter = b.dataset.s; document.querySelectorAll("#rankFilters .chip").forEach(c => c.classList.toggle("on", c === b)); renderRank() };
document.querySelectorAll("#rankTable th.sortable").forEach(th => th.onclick = () => {
  sortKey = th.dataset.sort; document.querySelectorAll("#rankTable th").forEach(t => t.classList.toggle("on", t === th)); renderRank() });

function renderRank() {
  const rows = table();
  let list = rows.filter(d => styleFilter === "Todos" || d.style === styleFilter);
  if (sortKey !== "nota") list = [...list].sort((a, b) => b[sortKey] - a[sortKey]);
  $("#rankTable tbody").innerHTML = list.map(d => {
    const prev = lastPos[d.name], mv = prev && prev !== d.pos ? (prev > d.pos ? `<span class="mv up">▲${prev - d.pos}</span>` : `<span class="mv dn">▼${d.pos - prev}</span>`) : "";
    return `<tr class="${d.pos <= 5 ? "top" : ""}${d.pos === 5 ? " cut" : ""}${d.name === flashName ? " flash" : ""}">
      <td class="pos">${String(d.pos).padStart(2, "0")}</td><td class="l dj">${d.name}${mv}</td><td class="l st hide-m">${d.style}</td>
      <td class="pt">${fmt(d.nota)}</td>${CRIT.map(([k]) => `<td class="hide-m">${fmt1(d[k])}</td>`).join("")}<td>${d.votos.toLocaleString("pt-BR")}</td></tr>`;
  }).join("");
  rows.forEach(d => lastPos[d.name] = d.pos); flashName = null;
}
renderRank();

/* ---------- votação ---------- */
const PARTIES = [
  { id: "gv-0709", label: "Green Valley · 07/09", dj: ["Alok", "Mochakk", "Classmatic"] },
  { id: "sr-1409", label: "Surreal · 14/09", dj: ["Vintage Culture", "Liu", "Öwnboss"] },
  { id: "wr-2109", label: "Warung · 21/09", dj: ["ANNA", "Victor Ruiz", "Gui Boratto"] },
  { id: "lr-2809", label: "Laroc · 28/09", dj: ["Cat Dealers", "Dubdogz", "KVSH"] },
  { id: "gv-1210", label: "Green Valley · 12/10", dj: ["Zerb", "Mojjo", "Beltran", "Illusionize"] },
];
let pickedDJ = null;
$("#vParty").innerHTML = `<option value="">Escolha a festa (demonstração)</option>` + PARTIES.map(p => `<option value="${p.id}">${p.label}</option>`).join("");
$("#vParty").onchange = () => { pickedDJ = null; renderLineup() };
function renderLineup() {
  const p = PARTIES.find(x => x.id === $("#vParty").value);
  $("#vLineup").innerHTML = p ? p.dj.map(n => `<button type="button" data-dj="${n}" class="${n === pickedDJ ? "on" : ""}">${n}</button>`).join("")
    : `<span class="mono dim">Escolha a festa primeiro</span>`;
}
$("#vLineup").onclick = e => { const b = e.target.closest("button"); if (!b) return; pickedDJ = b.dataset.dj; renderLineup() };
renderLineup();

$("#vSliders").innerHTML = CRIT.map(([k, l]) => `<div class="sl"><span>${l}</span><input type="range" min="0" max="10" step="0.5" value="7.5" id="s_${k}" aria-label="${l}"><output id="o_${k}">7,5</output></div>`).join("");
function sliders() {
  let t = 0; CRIT.forEach(([k]) => { const el = $("#s_" + k), v = +el.value; t += v;
    $("#o_" + k).textContent = fmt1(v); el.style.setProperty("--p", v * 10 + "%") });
  $("#vAvg").textContent = fmt1(t / 4);
}
$("#vSliders").oninput = sliders; sliders();

function msg(el, text, ok) { el.textContent = text; el.className = "form-msg " + (ok ? "ok" : "err") }
$("#voteForm").onsubmit = e => {
  e.preventDefault();
  const m = $("#voteMsg"), party = $("#vParty").value, name = $("#vName").value.trim();
  let ig = $("#vIg").value.trim().toLowerCase().replace(/^@?/, "@");
  if (!party) return msg(m, "Escolha a festa.");
  if (!pickedDJ) return msg(m, "Escolha o DJ que você quer avaliar.");
  if (!name) return msg(m, "Coloque seu nome.");
  if (!/^@[a-z0-9._]{2,30}$/.test(ig)) return msg(m, "Confira o @ do Instagram.");
  const votes = store.get("bb_votes", []);
  if (votes.some(v => v.party === party && v.dj === pickedDJ && v.ig === ig)) return msg(m, `${ig} já votou em ${pickedDJ} nessa festa. É um voto por @.`);
  const notas = {}; CRIT.forEach(([k]) => notas[k] = +$("#s_" + k).value);
  votes.push({ party, dj: pickedDJ, ig, name, notas, clubber: $("#vClubber").checked, comment: $("#vComment").value.trim(), at: Date.now() });
  store.set("bb_votes", votes);
  flashName = pickedDJ; renderRank();
  msg(m, `Voto registrado para ${pickedDJ}${$("#vClubber").checked ? " com peso 3" : ""}. Veja a tabela.`, true);
  toast("Voto registrado. A tabela foi atualizada.");
  $("#vComment").value = "";
};

/* ---------- cartão BRB ---------- */
const card = $("#clubCard");
card.parentElement.addEventListener("mousemove", e => {
  const b = card.getBoundingClientRect(), x = (e.clientX - b.left) / b.width - .5, y = (e.clientY - b.top) / b.height - .5;
  card.style.transform = `rotateY(${x * 22}deg) rotateX(${-y * 16}deg)`;
});
card.parentElement.addEventListener("mouseleave", () => card.style.transform = "");
$("#aIg").oninput = e => $("#ccIg").textContent = e.target.value ? "@" + e.target.value.replace(/^@/, "").toUpperCase() : "@SEU.INSTAGRAM";

$("#applyForm").onsubmit = e => {
  e.preventDefault();
  const m = $("#applyMsg");
  if (!$("#aName").value.trim()) return msg(m, "Coloque seu nome.");
  if ($("#aIg").value.trim().replace(/^@/, "").length < 2) return msg(m, "Coloque o @ do seu Instagram.");
  const apps = store.get("bb_apps", []); apps.push({ name: $("#aName").value.trim(), ig: $("#aIg").value.trim(), city: $("#aCity").value, plan: $("#aPlan").value, why: $("#aWhy").value.trim(), at: Date.now() });
  store.set("bb_apps", apps);
  msg(m, "Candidatura recebida (demonstração). Na versão final, ela chega para os Sócios Fundadores avaliarem.", true);
  e.target.reset(); $("#ccIg").textContent = "@SEU.INSTAGRAM";
};

/* ---------- críticos ---------- */
const REV = [
  { i: "MC", n: "Crítico BRB", f: 23, t: "Green Valley, 07/09:", e: "o fechamento que ninguém esperava", p: "Começou contido, segurou a pista por uma hora e virou o jogo no último terço. Graves impecáveis e uma leitura de público rara.", s: [9, 8, 10, 9] },
  { i: "AL", n: "Crítica BRB", f: 17, t: "Warung, 21/09:", e: "techno de templo", p: "Set longo, sem pressa, com transições que você só percebe depois. O tipo de noite que justifica a estrada até Itajaí.", s: [10, 9, 8, 10] },
  { i: "RP", n: "Crítico BRB", f: 31, t: "Surreal, 14/09:", e: "energia do começo ao fim", p: "Não deu respiro. Faltou um pouco de variação no meio, mas a pista não parou um minuto e o som da casa ajudou muito.", s: [8, 7, 10, 7] },
];
$("#reviews").innerHTML = REV.map((v, ix) => {
  const rr = rnd(5 + ix * 7);
  const bars = Array.from({ length: 64 }, (_, i) => { const x = i / 64, env = .35 + .65 * Math.abs(Math.sin(x * Math.PI * 3)); return `<i style="height:${Math.max(3, 40 * env * (.35 + .65 * rr()))}px"></i>` }).join("");
  return `<article class="rev rv"><div class="rev-top"><span class="av">${v.i}</span><div><b>${v.n}</b><span class="mono">BRB Clubber · ${v.f} festas</span></div></div>
    <h4>${v.t} <em>${v.e}</em></h4><div class="wave">${bars}</div><p>${v.p}</p>
    <div class="scores">${CRIT.map(([, l], j) => `<span>${l.toUpperCase()} ${v.s[j]}</span>`).join("")}</div></article>`;
}).join("");

/* ---------- loja ---------- */
const TEE = c => `<svg class="tee" viewBox="0 0 200 210"><path d="M66 10 22 30 6 74l30 12 6-18v134h116V68l6 18 30-12-16-44-44-20c-4 12-18 20-34 20S70 22 66 10z" fill="${c}" stroke="rgba(0,0,0,.08)"/></svg>`;
const SOLO = {
  shorts: `<svg class="solo" viewBox="0 0 120 110"><path d="M14 8h92l8 96H72L60 44 48 104H6z" fill="#009C3B"/><path d="M14 18h92" stroke="#FFD400" stroke-width="5"/><path d="M60 8v20" stroke="#00391C" stroke-width="2"/></svg>`,
  leque: `<svg class="solo" viewBox="0 0 120 90"><path d="M60 86 6 34a76 76 0 0 1 108 0z" fill="#FFD400" stroke="#00391C" stroke-width="3"/><g stroke="#00391C" stroke-width="2"><path d="M60 86 22 22M60 86 40 14M60 86V10M60 86l20-72M60 86l38-64"/></g><circle cx="60" cy="84" r="5" fill="#002776"/></svg>`,
  oculos: `<svg class="solo" viewBox="0 0 130 60"><rect x="6" y="14" width="50" height="32" rx="13" fill="#0A0B0A"/><rect x="74" y="14" width="50" height="32" rx="13" fill="#0A0B0A"/><path d="M56 26c4-5 14-5 18 0" stroke="#0A0B0A" stroke-width="5" fill="none"/><path d="M16 22l14 14M84 22l14 14" stroke="#FFD400" stroke-width="3"/></svg>`,
  chinelo: `<svg class="solo" viewBox="0 0 120 120"><ellipse cx="44" cy="62" rx="22" ry="48" fill="#002776"/><ellipse cx="80" cy="58" rx="22" ry="48" fill="#002776"/><path d="M44 32 28 62M44 32l16 30M80 28 64 58M80 28l16 30" stroke="#FFD400" stroke-width="6" stroke-linecap="round"/></svg>`,
};
const PRODUCTS = [
  { n: "Camiseta Logo BR Bayle", c: "Camisetas", d: "Preta · oversized", img: TEE("#111") + `<img class="print" src="assets/logo.webp" alt="">`, tag: "Lançamento" },
  { n: "Camiseta BR Bayle Off-white", c: "Camisetas", d: "Off-white · oversized", img: TEE("#F4F1E8") + `<img class="print" src="assets/logo.webp" alt="">`, tag: "Clássica", y: 1 },
  { n: "Camiseta BR Bayle Branca", c: "Camisetas", d: "Branca · oversized", img: TEE("#ffffff") + `<img class="print" src="assets/logo.webp" alt="">` },
  { n: "Camiseta BR Bayle Amarela", c: "Camisetas", d: "Amarela · oversized", img: TEE("#FFD400") + `<img class="print" src="assets/logo.webp" alt="">` },
  { n: "Shorts BR Bayle", c: "Shorts", d: "Verde · tactel", img: SOLO.shorts },
  { n: "Leque BR Bayle", c: "Acessórios", d: "Amarelo", img: SOLO.leque, tag: "Pista", y: 1 },
  { n: "Óculos BR Bayle", c: "Acessórios", d: "Preto", img: SOLO.oculos },
  { n: "Chinelo BR Bayle", c: "Acessórios", d: "Azul", img: SOLO.chinelo },
];
const cats = ["Todas", ...new Set(PRODUCTS.map(p => p.c))];
let cat = "Todas";
$("#shopFilters").innerHTML = cats.map(c => `<button class="chip${c === "Todas" ? " on" : ""}" data-c="${c}">${c}</button>`).join("");
$("#shopFilters").onclick = e => { const b = e.target.closest(".chip"); if (!b) return; cat = b.dataset.c;
  document.querySelectorAll("#shopFilters .chip").forEach(x => x.classList.toggle("on", x === b)); renderShop() };
function renderShop() {
  $("#products").innerHTML = PRODUCTS.filter(p => cat === "Todas" || p.c === cat).map((p, i) => `
    <div class="prod"><div class="prod-img">${p.tag ? `<span class="prod-tag${p.y ? " y" : ""}">${p.tag}</span>` : ""}${p.img}
      <button class="prod-add" data-i="${PRODUCTS.indexOf(p)}">Quero essa</button></div>
      <h4>${p.n}</h4><div class="mono">${p.d}</div><div class="pr">Em breve</div></div>`).join("");
}
renderShop();
let bag = store.get("bb_bag", []);
$("#bagCount").textContent = bag.length;
$("#products").onclick = e => { const b = e.target.closest(".prod-add"); if (!b) return;
  bag.push(PRODUCTS[b.dataset.i].n); store.set("bb_bag", bag); $("#bagCount").textContent = bag.length;
  $("#bagBtn").classList.remove("bump"); void $("#bagBtn").offsetWidth; $("#bagBtn").classList.add("bump");
  toast(`${PRODUCTS[b.dataset.i].n} na sua lista. Avisamos quando a loja abrir.`) };
$("#bagBtn").onclick = () => toast(bag.length ? `Sua lista: ${bag.length} peça(s). A loja abre em breve.` : "Sua sacola está vazia.");

/* ---------- toast ---------- */
let tt; function toast(t) { const el = $("#toast"); el.textContent = t; el.classList.add("on"); clearTimeout(tt); tt = setTimeout(() => el.classList.remove("on"), 3200) }

/* ---------- animação ao rolar ---------- */
document.querySelectorAll(".sec-head, .event, .table-wrap, .vote-card, .plan, .apply-form, .prod, .about-photo, .final-in").forEach(el => el.classList.add("rv"));
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target) } }), { threshold: .04, rootMargin: "0px 0px -40px 0px" });
document.querySelectorAll(".rv").forEach(el => io.observe(el));


/* ---------- carrosséis automáticos ---------- */
document.querySelectorAll(".slides").forEach(box => {
  const items = [...box.querySelectorAll(".slide")], ms = +box.dataset.auto || 4000;
  let i = 0, timer;
  const ui = document.createElement("div"); ui.className = "sl-ui";
  ui.innerHTML = `<button class="sl-prev" aria-label="Anterior">‹</button><div class="sl-dots">${items.map((_, k) => `<button aria-label="Foto ${k + 1}"></button>`).join("")}</div><span class="sl-count mono"></span><button class="sl-next" aria-label="Próxima">›</button>`;
  const bar = document.createElement("div"); bar.className = "sl-bar"; bar.style.setProperty("--ms", ms + "ms");
  box.append(ui, bar);
  const dots = [...ui.querySelectorAll(".sl-dots button")];
  function go(n) {
    i = (n + items.length) % items.length;
    items.forEach((s, k) => s.classList.toggle("on", k === i));
    dots.forEach((d, k) => d.classList.toggle("on", k === i));
    ui.querySelector(".sl-count").textContent = String(i + 1).padStart(2, "0") + " / " + String(items.length).padStart(2, "0");
    bar.classList.remove("run"); void bar.offsetWidth; bar.classList.add("run");
    const nx = items[(i + 1) % items.length].querySelector("img"); if (nx) nx.loading = "eager";
    clearTimeout(timer); timer = setTimeout(() => go(i + 1), ms);
  }
  ui.querySelector(".sl-prev").onclick = () => go(i - 1);
  ui.querySelector(".sl-next").onclick = () => go(i + 1);
  dots.forEach((d, k) => d.onclick = () => go(k));
  let x0 = null;
  box.addEventListener("touchstart", e => x0 = e.touches[0].clientX, { passive: true });
  box.addEventListener("touchend", e => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1)); x0 = null });
  go(0);
});
