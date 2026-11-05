/* Temperatura da Pista: agenda das festas anunciadas, uma seção por clube, com termômetro de interesse.
   Clubes e festas em window.BRB_TEMP (src/data/temperatura.json, via build); contagem e respostas em brb_interest. */
(() => {
  const box = document.getElementById("tpAgenda"), nav = document.getElementById("tpClubs");
  if (!box) return;
  const DATA = window.BRB_TEMP || {}, CLUBS = DATA.clubs || [];
  const FESTAS = (DATA.festas || []).slice().sort((a, b) => a.date.localeCompare(b.date));
  const SECS = CLUBS.map(c => ({ c, list: FESTAS.filter(f => f.club === c.id) })).filter(s => s.list.length);
  const MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const MESF = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const DIA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
  const OPTS = [["c", "tp-b1", "Vou com certeza"], ["q", "tp-b2", "Quero ir"], ["n", "tp-b3", "Não vou"]];
  const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  const dt = d => new Date(d + "T12:00:00");
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
  const fmt = n => n.toLocaleString("pt-BR");
  const say = m => (typeof toast === "function" ? toast(m) : alert(m));
  let counts = {}, mine = {}, busy = false;

  /* vou com certeza esquenta mais que quero ir; não vou esfria. 12° (ninguém vai) a 42° (todos vão com certeza) */
  function temp(id) {
    const k = counts[id] || { c: 0, q: 0, n: 0 }, tot = k.c + k.q + k.n;
    if (!tot) return { ...k, tot, deg: null, tier: "Sem respostas", color: "rgba(255,255,255,.35)", pct: 0 };
    const deg = Math.round(12 + ((2 * k.c + k.q) / (2 * tot)) * 30);
    const [tier, color] = deg >= 34 ? ["Fervendo", "var(--boil)"] : deg >= 28 ? ["Quente", "var(--hot)"] : deg >= 22 ? ["Morna", "var(--warm)"] : ["Gelada", "var(--cold)"];
    return { ...k, tot, deg, tier, color, pct: Math.round(((deg - 12) / 30) * 100) };
  }

  function row(f) {
    const d = dt(f.date), t = temp(f.id), past = f.date < today;
    const tube = `<div class="tp-vt"><span class="tp-vbulb"><span class="tp-vtube" style="--w:${t.pct}%;--bh:${t.pct ? Math.round(10000 / t.pct) : 100}%"><i></i></span></span><div><span class="tp-deg">${t.deg === null ? "—" : t.deg + "°"}</span><br><span class="tp-tier">${t.tier}</span></div></div>`;
    const line = t.tot ? `<p class="tp-counts"><b>${fmt(t.c)}</b> vão · <b>${fmt(t.q)}</b> querem ir · <b>${fmt(t.n)}</b> não vão</p>` : `<p class="tp-counts">Ninguém respondeu ainda.</p>`;
    const vote = past ? `<p class="tp-closed mono">Festa encerrada</p>` : `<div class="tp-vote" role="group" aria-label="Você vai em ${esc(f.name)}?">${OPTS.map(([v, cls, l]) =>
      `<button type="button" class="tp-b ${cls}" data-id="${esc(f.id)}" data-v="${v}" aria-pressed="${mine[f.id] === v}">${l}</button>`).join("")}</div>`;
    return `<article class="tp-row" style="--heat:${t.color}"><div class="tp-row-date"><b>${String(d.getDate()).padStart(2, "0")}</b><span>${MES[d.getMonth()]} · ${DIA[d.getDay()]}</span></div>
      <div class="tp-row-main">${f.photo ? `<img class="tp-row-av" src="${esc(f.photo)}" alt="" loading="lazy" width="62" height="62">` : `<span class="tp-row-av tp-row-ini" aria-hidden="true">${esc(f.name.slice(0, 1))}</span>`}
      <p class="tp-kick">${esc(f.tag || f.venue + " · " + f.cidade)}</p><h3>${esc(f.name)}</h3>
      <p>${f.lineup.slice(0, 12).map(esc).join(" · ")}${f.lineup.length > 12 ? ` · e mais ${f.lineup.length - 12} atrações` : ""}${f.partial ? ` · <em>mais atrações a anunciar</em>` : ""}</p></div>
      <div>${tube}${line}</div>${past ? vote : `<div class="tp-act"><button type="button" class="tp-p2p" data-p2p="${esc(f.id)}"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2.2a2.8 2.8 0 0 0 0 5.6V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2.2a2.8 2.8 0 0 0 0-5.6V7Zm10 1.2h1.6v1.6H13V8.2Zm0 3h1.6v1.6H13v-1.6Zm0 3h1.6v1.6H13v-1.6Z"/></svg><span>Vender ingresso P2P</span></button>${vote}</div>`}</article>`;
  }

  function months(list) {
    let out = "", m = "";
    for (const f of list) {
      const d = dt(f.date), mm = MESF[d.getMonth()] + " " + d.getFullYear();
      if (mm !== m) { out += `<h3 class="tp-month">${mm}</h3>`; m = mm; }
      out += row(f);
    }
    return out;
  }

  function render() {
    box.innerHTML = SECS.map(({ c, list }) => `<section class="tp-club" id="clube-${esc(c.id)}" aria-labelledby="tc-${esc(c.id)}">
      <header class="tp-club-head"><h2 class="display" id="tc-${esc(c.id)}">${esc(c.nome)}</h2><p class="mono dim">${esc(c.cidade)} · ${list.length} festa${list.length > 1 ? "s" : ""}</p></header>
      <div class="tp-list">${months(list)}</div></section>`).join("") || `<p class="dim">Nenhuma festa anunciada por enquanto.</p>`;
  }
  if (nav && SECS.length > 1) {
    const sorted = SECS.slice().sort((a, b) => a.c.nome.localeCompare(b.c.nome, "pt-BR"));
    nav.innerHTML = '<button type="button" class="tp-pick-btn" aria-expanded="false" aria-controls="tpPickList"><span>Escolher clube</span><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" d="m6 9 6 6 6-6"/></svg></button><ul class="tp-pick-list" id="tpPickList" hidden>' + sorted.map(({ c, list }) => '<li><a href="#clube-' + esc(c.id) + '">' + esc(c.nome) + ' <span>' + list.length + "</span></a></li>").join("") + "</ul>";
    const btn = nav.querySelector(".tp-pick-btn"), menu = nav.querySelector(".tp-pick-list");
    const setOpen = o => { menu.hidden = !o; btn.setAttribute("aria-expanded", String(o)); };
    btn.addEventListener("click", () => setOpen(menu.hidden));
    menu.addEventListener("click", e => { if (e.target.closest("a")) setOpen(false); });
    document.addEventListener("click", e => { if (!nav.contains(e.target)) setOpen(false); });
    document.addEventListener("keydown", e => { if (e.key === "Escape") { setOpen(false); btn.focus(); } });
  }

  async function load() {
    try { const r = await BRB.interest("list"); counts = r.counts || {}; mine = r.mine || {}; }
    catch (e) { /* sem conexão: mostra a agenda sem a contagem */ }
    render();
  }

  box.addEventListener("click", async e => {
    const b = e.target.closest(".tp-b[data-v]");
    if (!b || busy) return;
    const { id, v } = b.dataset;
    const { data } = await BRB.auth.getSession();
    if (!data.session) { location.assign("/conta?next=" + encodeURIComponent("/intermediacao")); return; }
    const choice = mine[id] === v ? null : v;
    busy = true; b.disabled = true;
    try {
      const r = await BRB.interest("set", { event: id, choice });
      if (r && r.login === false) { say("Confirme seu e-mail para responder."); return; }
      counts = r.counts || counts; mine = r.mine || {};
      if (choice) say(choice === "c" ? "Fechou! Você vai." : choice === "q" ? "Anotado: você quer ir." : "Anotado: você não vai.");
    } catch (err) { say(err.message); }
    finally { busy = false; render(); }
  });

  render();
  load();
})();

/* Fundo do hero: três painéis inclinados com fotos de festas, trocando em fade (cada painel no seu tempo) */
(() => {
  const hero = document.getElementById("tpHero");
  if (!hero) return;
  const FOTOS = [2037, 2038, 2039, 2040, 2041, 2042, 2043, 2044, 2045, 2046, 2047, 2048, 2049, 2050, 2051].map(n => "/assets/temperatura/festa-" + n + ".webp");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const rot = (a, n) => a.map((_, i) => a[(i + n) % a.length]);
  hero.innerHTML = '<div class="h-panels">' + [0, 1, 2].map(p => '<div class="h-panel"><div class="h-panel-in">' + rot(FOTOS, p * 5).map((s, i) => '<figure class="fx' + (i ? "" : " on") + '"><img src="' + s + '" alt="" ' + (i ? 'loading="lazy"' : "") + ' decoding="async"></figure>').join("") + "</div></div>").join("") + "</div>";
  if (reduce) return;
  hero.querySelectorAll(".h-panel-in").forEach((box, p) => {
    const k = [...box.children]; let i = 0;
    setTimeout(() => setInterval(() => { k[i].classList.remove("on"); i = (i + 1) % k.length; k[i].classList.add("on"); }, 7500), p * 2500);
  });
})();
