/* Manifesto: fotos e vídeos de fundo trocando em fade. Cada .mf-bg tem várias .mf-s; só a seção visível anima.
   Na seção .mf-flashy, um clarão branco que some em fade marca a entrada e cada troca. */
(() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const INTERVAL = 6500;
  const vid = fig => fig.querySelector("video");
  const play = fig => { const v = vid(fig); if (v) { v.play().catch(() => {}); } };
  const pause = fig => { const v = vid(fig); if (v) v.pause(); };
  /* celular: a seção nunca fica mais baixa que o texto dela (evita texto cortado em telas estreitas) */
  const needFit = () => { document.querySelectorAll(".mf-tx.dv").forEach(t => t.style.setProperty("--th", t.getBoundingClientRect().height + "px")); const mob = matchMedia("(max-width:700px)").matches; document.querySelectorAll(".mf-b").forEach(s => s.style.removeProperty("--need")); if (!mob) return; document.querySelectorAll(".mf-tx.mv").forEach(t => { const s = t.closest(".mf-b"), h = t.getBoundingClientRect().height; t.style.setProperty("--th", h + "px"); s.style.setProperty("--need", Math.ceil(h + 56) + "px"); }); document.querySelectorAll(".mf-flashy .mf-big").forEach(t => { const s = t.closest(".mf-b"); s.style.setProperty("--need", Math.ceil(t.getBoundingClientRect().height + 56) + "px"); }); };
  needFit(); addEventListener("resize", needFit); addEventListener("load", needFit); if (document.fonts && document.fonts.ready) document.fonts.ready.then(needFit);
  const duoInit = bg => {
    if (bg._duoOn) return; const srcs = JSON.parse(bg.dataset.srcs || "[]"), imgs = [...bg.querySelectorAll(".mf-dp img")]; if (srcs.length < 2 || imgs.length < 2) return; bg._duoOn = true;
    const order = srcs.slice(); for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    let k = 0, side = 0, timer = null, io = null;
    const pre = () => srcs.forEach(s => { const im = new Image(); im.src = s; });
    const tick = () => { const im = imgs[side]; im.src = order[k++ % order.length]; im.classList.remove("go"); void im.offsetWidth; im.classList.add("go"); side = 1 - side; };
    const start = () => { if (timer || reduce) return; pre(); tick(); timer = setInterval(tick, 400); };
    const stop = () => { clearInterval(timer); timer = null; };
    bg._duoStop = () => { stop(); if (io) io.disconnect(); bg._duoOn = false; };
    io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) start(); else stop(); }), { threshold: .25 }); io.observe(bg.closest(".mf-b") || bg);
  };
  window.mfDuoInit = duoInit; document.querySelectorAll(".mf-duo").forEach(duoInit);
  document.querySelectorAll(".mf-flashy[data-fx]").forEach(s => new IntersectionObserver(es => es.forEach(e => s.classList.toggle("fx-on", e.isIntersecting)), { threshold: .35 }).observe(s));
  document.querySelectorAll(".mf-mosaic").forEach(m => {
    const sec = m.closest(".mf-b"), fit = () => { const n = +m.dataset.n || m.children.length, r = sec.getBoundingClientRect(); if (!(r.width > 0 && r.height > 0)) return; const c = Math.max(2, Math.round(Math.sqrt(n * r.width / r.height))), rw = Math.ceil(n / c), t = c * rw; m.style.setProperty("--cols", c); m.style.setProperty("--rows", rw); [...m.children].forEach((f, i) => { f.hidden = i >= t; }); };
    fit(); new ResizeObserver(fit).observe(sec);
  });
  document.querySelectorAll(".mf-bg:not(.mf-mosaic):not(.mf-duo)").forEach(bg => {
    const sec = bg.closest(".mf-b"), figs = [...bg.querySelectorAll(".mf-s")], fl = sec.dataset.fx ? null : sec.querySelector(".mf-flash");
    let i = 0, timer = null;
    const flash = () => { if (!fl || reduce) return; fl.classList.remove("go"); void fl.offsetWidth; fl.classList.add("go"); };
    const show = n => { figs[i].classList.remove("on"); pause(figs[i]); i = n; figs[i].classList.add("on"); play(figs[i]); };
    const start = () => { play(figs[i]); if (figs.length > 1 && !reduce && !timer) timer = setInterval(() => { show((i + 1) % figs.length); flash(); }, +bg.dataset.ms || INTERVAL); };
    const stop = () => { clearInterval(timer); timer = null; figs.forEach(pause); };
    new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { start(); flash(); } else stop(); }), { threshold: .35 }).observe(sec);
  });
})();
