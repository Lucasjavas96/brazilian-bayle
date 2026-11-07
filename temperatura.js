/* Temperatura da Pista: agenda das festas anunciadas, uma seção por clube.
   Clubes e festas em window.BRB_TEMP (src/data/temperatura.json, via build). A venda e a compra de ingresso ficam em ingressos.js. */
(() => {
  const box = document.getElementById("tpAgenda"), nav = document.getElementById("tpClubs");
  if (!box) return;
  const DATA = window.BRB_TEMP || {}, CLUBS = DATA.clubs || [];
  const FESTAS = (DATA.festas || []).slice().sort((a, b) => a.date.localeCompare(b.date));
  const SECS = CLUBS.map(c => ({ c, list: FESTAS.filter(f => f.club === c.id) })).filter(s => s.list.length);
  const MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const MESF = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const DIA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
  const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  const dt = d => new Date(d + "T12:00:00");
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
  const fmt = n => n.toLocaleString("pt-BR");
  const say = m => (typeof toast === "function" ? toast(m) : alert(m));


  function row(f) {
    const d = dt(f.date), past = f.date < today;
    return `<article class="tp-row"><div class="tp-row-date"><b>${String(d.getDate()).padStart(2, "0")}</b><span>${MES[d.getMonth()]} · ${DIA[d.getDay()]}</span></div>
      <div class="tp-row-main">${f.photo ? `<img class="tp-row-av" src="${esc(f.photo)}" alt="" loading="lazy" width="62" height="62">` : `<span class="tp-row-av tp-row-ini" aria-hidden="true">${esc(f.name.slice(0, 1))}</span>`}
      <p class="tp-kick">${esc(f.tag || f.venue + " · " + f.cidade)}</p><h3>${esc(f.name)}</h3>
      <p>${f.lineup.slice(0, 12).map(esc).join(" · ")}${f.lineup.length > 12 ? ` · e mais ${f.lineup.length - 12} atrações` : ""}${f.partial ? ` · <em>mais atrações a anunciar</em>` : ""}</p></div>
      ${past ? `<p class="tp-closed mono">Festa encerrada</p>` : `<div class="tp-act"><button type="button" class="tp-p2p" data-p2p="${esc(f.id)}"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2.2a2.8 2.8 0 0 0 0 5.6V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2.2a2.8 2.8 0 0 0 0-5.6V7Zm10 1.2h1.6v1.6H13V8.2Zm0 3h1.6v1.6H13v-1.6Zm0 3h1.6v1.6H13v-1.6Z"/></svg><span>Vender ingresso P2P</span></button><p class="tp-n mono" data-p2p-n="${esc(f.id)}" hidden></p></div>`}</article>`;
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

  render();
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
