/* Manifesto: fotos e vídeos de fundo trocando em fade. Cada .mf-bg tem várias .mf-s; só a seção visível anima.
   Na seção .mf-flashy, um clarão branco que some em fade marca a entrada e cada troca. */
(() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const INTERVAL = 6500;
  const vid = fig => fig.querySelector("video");
  const play = fig => { const v = vid(fig); if (v) { v.play().catch(() => {}); } };
  const pause = fig => { const v = vid(fig); if (v) v.pause(); };
  document.querySelectorAll(".mf-mosaic").forEach(m => {
    const sec = m.closest(".mf-b"), n = m.children.length, fit = () => { const r = sec.getBoundingClientRect(); if (r.width > 0 && r.height > 0) m.style.setProperty("--cols", Math.max(2, Math.round(Math.sqrt(n * r.width / r.height)))); };
    fit(); new ResizeObserver(fit).observe(sec);
  });
  document.querySelectorAll(".mf-bg:not(.mf-mosaic)").forEach(bg => {
    const sec = bg.closest(".mf-b"), figs = [...bg.querySelectorAll(".mf-s")], fl = sec.querySelector(".mf-flash");
    let i = 0, timer = null;
    const flash = () => { if (!fl || reduce) return; fl.classList.remove("go"); void fl.offsetWidth; fl.classList.add("go"); };
    const show = n => { figs[i].classList.remove("on"); pause(figs[i]); i = n; figs[i].classList.add("on"); play(figs[i]); };
    const start = () => { play(figs[i]); if (figs.length > 1 && !reduce && !timer) timer = setInterval(() => { show((i + 1) % figs.length); flash(); }, INTERVAL); };
    const stop = () => { clearInterval(timer); timer = null; figs.forEach(pause); };
    new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { start(); flash(); } else stop(); }), { threshold: .35 }).observe(sec);
  });
})();
