/* Bayle All Stars Album (modo teste)
   Jog wheel girada com o dedo ou o mouse sorteia uma das figurinhas prontas; ela voa e é colada no álbum.
   Álbum, giros e repetidas ficam só neste navegador até o álbum ser ligado à conta do BRB Clubber.
   Usa $, $$, store, reduced e toast do app.js. */
(() => {
  const dataEl = $("#albumData"); if (!dataEl) return;
  const DATA = JSON.parse(dataEl.textContent), CARDS = DATA.cards, POOL = Object.keys(CARDS);
  const KEY = "bb_album_v1", GIROS_TESTE = 10;
  const load = () => { const s = store.get(KEY, null); return s && s.coladas ? s : { giros: GIROS_TESTE, coladas: {} } };
  let S = load();
  const save = () => store.set(KEY, S);
  const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const flag = f => f ? `/assets/flags/${f}.webp` : "";

  /* ---------- carta grande (frente estilo FIFA por raridade, verso com a arte do álbum) ---------- */
  function bigCard(c) {
    const top = Object.entries(c.attrs).reduce((a, b) => b[1] > a[1] ? b : a)[0];
    const stars = Math.max(1, Math.min(10, Math.round((c.ovr - 70) / 3)));
    return `<div class="djc ${c.cls}" tabindex="0" aria-label="${esc(c.nome)}, overall ${c.ovr}, figurinha ${c.rar}">
      <div class="djc-face djc-front"><div class="djc-inner">
        <img class="djc-photo" src="${c.foto}" alt="${esc(c.nome)}" style="object-position:${c.pos};${c.zoom ? `transform:${c.zoom};transform-origin:${c.origin}` : ""}">
        <div class="djc-shade"></div>
        <div class="djc-ovr"><strong>${c.ovr}</strong><span>${esc(c.tag)}</span><img src="${flag(c.flag)}" alt="${esc(c.paisNome)}"></div>
        <div class="djc-corner"><div class="djc-rank">${esc(c.rank)}</div><div class="djc-stars">${"<i></i>".repeat(stars)}</div></div>
        <div class="djc-info">
          <h3>${esc(c.nome)}</h3>
          <div class="djc-type"><b>DJ · ${esc(c.genero)} · ${esc(c.bpm)} BPM</b><span>${esc(c.num)}</span></div>
          <div class="djc-stats">${Object.entries(c.attrs).map(([k, v]) => `<div class="djc-stat${k === top ? " top" : ""}"><b>${v}</b><span>${k}</span><i style="--p:${Math.round((v - 60) / 39 * 100)}%"></i></div>`).join("")}</div>
          <p class="djc-flavor">${esc(c.texto)}</p>
          <div class="djc-foot"><b>♪ ${esc(c.faixa)}</b><span>★ ${c.rar}</span></div>
        </div>
      </div><div class="djc-foil"></div><div class="djc-glare"></div></div>
      <div class="djc-face djc-back"><img src="/assets/album/verso.webp" alt="Verso: Bayle All Stars Album"><div class="djc-glare"></div></div>
    </div>`;
  }
  const fit = root => $$(".djc-info h3", root).forEach(h => {
    h.style.fontSize = ""; let s = parseFloat(getComputedStyle(h).fontSize);
    while (h.scrollWidth > h.clientWidth && s > 8) { s -= .5; h.style.fontSize = s + "px" }
  });
  function tilt(card) {
    card.addEventListener("pointermove", e => {
      if (e.pointerType === "touch") return;
      const r = card.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      card.classList.add("live");
      card.style.setProperty("--mx", x * 100 + "%"); card.style.setProperty("--my", y * 100 + "%");
      card.style.setProperty("--ry", (x - .5) * 22 + "deg"); card.style.setProperty("--rx", (.5 - y) * 22 + "deg"); card.style.setProperty("--o", 1);
    });
    card.addEventListener("pointerleave", () => {
      card.classList.remove("live");
      for (const [k, v] of [["--rx", "0deg"], ["--ry", "0deg"], ["--o", 0], ["--mx", "50%"], ["--my", "50%"]]) card.style.setProperty(k, v);
    });
    const flip = () => card.classList.toggle("flip");
    card.addEventListener("click", flip);
    card.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip() } });
  }

  /* ---------- álbum ---------- */
  const mini = c => `<button type="button" class="ab-st ${c.cls}" data-card="${c.slug}" aria-label="${esc(c.nome)}, ${c.num}, abrir figurinha">
      <img src="${c.foto}" alt="" loading="lazy" style="object-position:${c.pos}"><span class="ab-st-ovr">${c.ovr}</span>
      <span class="ab-st-txt"><b>${esc(c.nome)}</b><small>${esc(c.num)} · ${c.rar}</small></span></button>`;
  const slot = (d, i) => {
    const c = d.id && S.coladas[d.id] ? CARDS[d.id] : null;
    return `<div class="ab-slot${c ? " filled" : ""}" id="slot-${d.id || "x" + i}" data-num="${esc(d.num)}">${c ? mini(c) :
      `<span class="ab-num">${esc(d.num)}</span>${d.flag && !d.page ? `<img class="ab-slot-flag" src="${flag(d.flag)}" alt="" loading="lazy">` : ""}<b class="ab-name">${esc(d.nome)}</b><small class="ab-genre">${esc(d.genero)}</small>`}</div>`;
  };
  function renderAlbum() {
    let k = 0;
    $("#abNav").innerHTML = DATA.pages.map(p => `<a href="#pg-${p.sigla}" class="ab-chip">${p.flag ? `<img src="${flag(p.flag)}" alt="" loading="lazy">` : '<span class="ab-globe" aria-hidden="true">🌍</span>'}${esc(p.sigla)}</a>`).join("");
    $("#abPages").innerHTML = DATA.pages.map(p => `<section class="ab-page" id="pg-${p.sigla}" aria-labelledby="h-${p.sigla}" ${p.flag ? `style="--flag:url(${flag(p.flag)})"` : ""}>
      <header class="ab-page-head${p.flag ? "" : " world"}">
        ${p.flag ? `<img class="ab-flag" src="${flag(p.flag)}" alt="Bandeira: ${esc(p.nome)}" loading="lazy">` : '<span class="ab-flag ab-flag-world" aria-hidden="true"></span>'}
        <div><p class="mono ab-gold">${esc(p.sigla)} · Seleção</p><h3 id="h-${p.sigla}">${esc(p.nome)}</h3></div>
        <p class="ab-count mono" data-count="${p.sigla}"></p>
      </header>
      <div class="ab-grid">${p.djs.map(d => slot({ ...d, page: !!p.flag }, k++)).join("")}</div>
    </section>`).join("");
    counts();
  }
  function counts() {
    const got = Object.keys(S.coladas).length, reps = Object.values(S.coladas).reduce((a, n) => a + n - 1, 0);
    $("#abColadas").textContent = got; $("#abTotal").textContent = DATA.total; $("#abRep").textContent = reps;
    $("#abGiros").textContent = S.giros; $("#abGiros2").textContent = S.giros;
    $("#abSpin").disabled = S.giros <= 0;
    $("#abJogHint").textContent = S.giros > 0 ? "Arraste em círculo e solte com força, como quem faz scratch. Onde ela parar, sai a sua figurinha." : "Seus giros de teste acabaram. Use \"Recomeçar teste\" para ganhar 10 de novo.";
    DATA.pages.forEach(p => { const n = p.djs.filter(d => d.id && S.coladas[d.id]).length; $(`[data-count="${p.sigla}"]`).innerHTML = `<b>${n}</b>/${p.djs.length}`; });
    const repsEl = $("#abReps"); repsEl.hidden = !reps;
    $("#abRepsGrid").innerHTML = Object.entries(S.coladas).filter(([, n]) => n > 1).map(([s, n]) => `<div class="ab-slot filled">${mini(CARDS[s])}<span class="ab-x mono">×${n - 1}</span></div>`).join("");
  }

  /* ---------- jog wheel ---------- */
  const jog = $("#abJog"), plate = $("#abPlate");
  let angle = 0, spinning = false, drag = null;
  const center = () => { const r = jog.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2] };
  const angAt = e => { const [cx, cy] = center(); return Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI };
  const paint = () => plate.style.transform = `rotate(${angle}deg)`;
  jog.addEventListener("pointerdown", e => {
    if (spinning) return;
    if (S.giros <= 0) return toast("Seus giros de teste acabaram. Use Recomeçar teste.");
    try { jog.setPointerCapture(e.pointerId) } catch {} jog.classList.add("grab");
    drag = { a: angAt(e), samples: [] };
  });
  jog.addEventListener("pointermove", e => {
    if (!drag) return;
    const a = angAt(e); let d = a - drag.a; if (d > 180) d -= 360; if (d < -180) d += 360;
    drag.a = a; angle += d; paint(); drag.samples.push([performance.now(), d]);
  });
  const release = () => {
    if (!drag) return; jog.classList.remove("grab");
    const now = performance.now(), recent = drag.samples.filter(([t]) => now - t < 120), sum = recent.reduce((s, [, d]) => s + d, 0);
    drag = null;
    const v = recent.length ? sum / Math.max(16, now - recent[0][0]) : 0; // graus por ms
    if (Math.abs(v) < .45) { toast("Gire com mais força e solte!"); return }
    spin(v);
  };
  jog.addEventListener("pointerup", release); jog.addEventListener("pointercancel", release);
  const kick = () => { if (!spinning && S.giros > 0) spin((Math.random() < .5 ? -1 : 1) * (1.4 + Math.random() * .8)); else if (S.giros <= 0) toast("Seus giros de teste acabaram. Use Recomeçar teste.") };
  $("#abSpin").onclick = kick;
  jog.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); kick() } });

  function spin(v) {
    spinning = true; S.giros -= 1; save(); counts(); jog.classList.add("spinning");
    // desaceleração exponencial calculada pelo tempo: o giro termina na hora certa mesmo se a tela engasgar
    v = Math.sign(v) * Math.min(Math.abs(v), 3.2);
    const k = reduced ? .01 : .0025, T = Math.min(6000, Math.log(Math.abs(v) / .015) / k), a0 = angle, start = performance.now();
    const at = t => a0 + v / k * (1 - Math.exp(-k * t));
    let done = false;
    const step = now => { if (done) return; angle = at(Math.min(T, now - start)); paint(); requestAnimationFrame(step) };
    requestAnimationFrame(step);
    setTimeout(() => { done = true; angle = at(T); paint(); jog.classList.remove("spinning"); spinning = false; draw() }, T);
  }

  /* ---------- sorteio, revelação e colagem ---------- */
  let current = null;
  function draw() {
    const slug = POOL[Math.floor(Math.random() * POOL.length)], c = CARDS[slug], dup = !!S.coladas[slug];
    current = { slug, dup };
    $("#abRevealCard").innerHTML = bigCard(c);
    $("#abRevealRar").innerHTML = `<b class="rar-${c.cls}">${c.rar}</b>${dup ? " · repetida" : ""}`;
    $("#abStick").textContent = dup ? "Guardar nas repetidas" : "Colar no álbum";
    const rv = $("#abReveal"); rv.hidden = false; rv.className = "ab-reveal show r-" + c.cls;
    const card = $(".djc", rv); card.classList.add("flip"); fit(rv);
    setTimeout(() => { card.classList.remove("flip"); fit(rv) }, reduced ? 50 : 650);
    $("#abStick").focus();
  }
  $("#abStick").onclick = () => {
    const { slug, dup } = current, c = CARDS[slug], rv = $("#abReveal");
    const from = $(".djc", rv).getBoundingClientRect();
    rv.hidden = true; rv.className = "ab-reveal";
    S.coladas[slug] = (S.coladas[slug] || 0) + 1; save();
    if (dup) { counts(); toast(`${c.nome} foi para as repetidas.`); $("#abReps").scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" }); return }
    const target = $(`#slot-${slug}`);
    target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
    setTimeout(() => {
      const to = target.getBoundingClientRect();
      const fly = document.createElement("div"); fly.className = "ab-fly"; fly.innerHTML = mini(c);
      Object.assign(fly.style, { left: to.left + "px", top: to.top + "px", width: to.width + "px", height: to.height + "px",
        transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width}) rotate(-8deg)` });
      document.body.appendChild(fly);
      requestAnimationFrame(() => requestAnimationFrame(() => { fly.classList.add("go"); fly.style.transform = "none" }));
      setTimeout(() => {
        fly.remove();
        target.outerHTML = slot({ ...findDj(slug), page: true }, 0);
        const fresh = $(`#slot-${slug}`); fresh.classList.add("just");
        counts(); toast(`Figurinha ${c.num} colada!`);
      }, reduced ? 60 : 720);
    }, reduced ? 50 : 550);
  };
  const findDj = slug => { for (const p of DATA.pages) { const d = p.djs.find(x => x.id === slug); if (d) return { ...d, page: !!p.flag } } };

  /* ---------- figurinha grande ao tocar ---------- */
  document.addEventListener("click", e => {
    const st = e.target.closest(".ab-st"); if (!st) return;
    $("#abModalCard").innerHTML = bigCard(CARDS[st.dataset.card]);
    $("#abModal").hidden = false; fit($("#abModal")); tilt($("#abModal .djc")); $("#abModal .djc").focus();
  });
  const closeModal = () => { $("#abModal").hidden = true; $("#abModalCard").innerHTML = "" };
  $("#abClose").onclick = closeModal;
  $("#abModal").addEventListener("click", e => { if (e.target.id === "abModal") closeModal() });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("#abModal").hidden) closeModal() });

  // modo teste: cola de uma vez todas as figurinhas prontas, para ver o álbum montado
  $("#abAll").onclick = () => { POOL.forEach(s => { S.coladas[s] ||= 1 }); save(); renderAlbum(); toast(`${POOL.length} figurinhas coladas.`) };
  $("#abReset").onclick = () => { if (!confirm("Zerar o álbum de teste e ganhar 10 giros de novo?")) return; S = { giros: GIROS_TESTE, coladas: {} }; save(); renderAlbum(); toast("Teste recomeçado: álbum vazio e 10 giros.") };

  renderAlbum(); save(); addEventListener("resize", () => { if (!$("#abReveal").hidden) fit($("#abReveal")); if (!$("#abModal").hidden) fit($("#abModal")) });
})();
