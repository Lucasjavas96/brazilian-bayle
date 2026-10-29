/* Editor dos botões do Hero. Só existe no localhost (aberto com ?editar). Nunca vai para o site publicado.
   Clique num botão para selecionar, arraste para mover, puxe o canto para mudar o tamanho.
   Tudo é salvo sozinho em _local/botoes-hero.json para o Claude ler. */
(() => {
  const btns = [...document.querySelectorAll(".hero-actions .btn")];
  if (!btns.length) return;
  const KEY = "brb-editor-botoes";
  let state = {};
  try { state = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) { state = {}; }
  const id = b => b.textContent.trim();
  let sel = null;

  const css = document.createElement("style");
  css.textContent = `
  .ed-on .hero-actions .btn{cursor:grab;user-select:none;position:relative;touch-action:none}
  .ed-on .hero-actions .btn.ed-sel{outline:3px dashed #ffe600;outline-offset:4px;z-index:50}
  .ed-h{position:absolute;right:0;bottom:0;width:18px;height:18px;background:#ffe600;border:1px solid #000;cursor:nwse-resize;z-index:5}
  .ed-off{opacity:.25}
  .ed-panel{position:fixed;right:16px;bottom:16px;width:290px;background:#111;color:#fff;border:1px solid #ffe600;border-radius:10px;padding:12px;font:12px/1.4 system-ui,sans-serif;z-index:99999;box-shadow:0 10px 40px #000a}
  .ed-panel h4{margin:0 0 8px;font-size:13px;color:#ffe600}
  .ed-panel label{display:flex;justify-content:space-between;align-items:center;gap:8px;margin:4px 0}
  .ed-panel input[type=number]{width:70px;background:#222;color:#fff;border:1px solid #555;border-radius:4px;padding:3px}
  .ed-panel button{background:#ffe600;color:#000;border:0;border-radius:6px;padding:6px 10px;font-weight:700;cursor:pointer;margin:6px 6px 0 0}
  .ed-panel button.g{background:#333;color:#fff}
  .ed-panel small{color:#aaa;display:block;margin-top:6px}`;
  document.head.appendChild(css);
  document.documentElement.classList.add("ed-on");

  const get = b => state[id(b)] || (state[id(b)] = { show: true, dx: 0, dy: 0, w: null, h: null, fs: null });
  function apply(b) {
    const s = get(b);
    b.style.left = s.dx + "px"; b.style.top = s.dy + "px";
    b.style.width = s.w ? s.w + "px" : ""; b.style.height = s.h ? s.h + "px" : ""; b.style.minHeight = s.h ? "0" : "";
    b.style.fontSize = s.fs ? s.fs + "px" : "";
    b.style.display = "";
    b.classList.toggle("ed-off", !s.show);
  }
  let timer;
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { }
    clearTimeout(timer);
    timer = setTimeout(() => {
      const out = { tela: { largura: innerWidth, altura: innerHeight }, botoes: btns.map(b => { const r = b.getBoundingClientRect(), s = get(b); return { texto: id(b), mostrar: s.show, deslocamento_x: s.dx, deslocamento_y: s.dy, largura: Math.round(r.width), altura: Math.round(r.height), fonte_px: s.fs || parseFloat(getComputedStyle(b).fontSize), posicao_na_tela: { x: Math.round(r.left), y: Math.round(r.top) } }; }) };
      fetch("/__salvar", { method: "POST", body: JSON.stringify(out, null, 2) }).catch(() => { });
    }, 250);
  }

  const panel = document.createElement("div"); panel.className = "ed-panel";
  panel.innerHTML = `<h4>Editor dos botões do Hero</h4><div id="edBody"><small>Clique num botão para editar. Arraste para mover. Puxe o quadrado amarelo para o tamanho.</small></div>
  <button id="edReset" class="g">Voltar ao original</button><button id="edSave">Salvar para o Claude</button><small id="edMsg"></small>`;
  document.body.appendChild(panel);
  const body = panel.querySelector("#edBody"), msg = panel.querySelector("#edMsg");

  function draw() {
    if (!sel) { return; }
    const s = get(sel), r = sel.getBoundingClientRect();
    body.innerHTML = `<b>${id(sel)}</b>
    <label>Mostrar no PC <input type="checkbox" id="edShow" ${s.show ? "checked" : ""}></label>
    <label>Largura (px) <input type="number" id="edW" value="${Math.round(r.width)}"></label>
    <label>Altura (px) <input type="number" id="edH" value="${Math.round(r.height)}"></label>
    <label>Tamanho do texto (px) <input type="number" id="edF" value="${Math.round(s.fs || parseFloat(getComputedStyle(sel).fontSize))}"></label>
    <small>Setas movem 1px (Shift: 10px).</small>`;
    body.querySelector("#edShow").onchange = e => { s.show = e.target.checked; apply(sel); save(); };
    body.querySelector("#edW").onchange = e => { s.w = +e.target.value; apply(sel); save(); };
    body.querySelector("#edH").onchange = e => { s.h = +e.target.value; apply(sel); save(); };
    body.querySelector("#edF").onchange = e => { s.fs = +e.target.value; apply(sel); save(); draw(); };
  }
  const select = b => { sel && sel.classList.remove("ed-sel"); sel = b; b.classList.add("ed-sel"); draw(); };

  btns.forEach(b => {
    const h = document.createElement("span"); h.className = "ed-h"; b.appendChild(h);
    apply(b);
    b.addEventListener("click", e => e.preventDefault());
    b.addEventListener("pointerdown", e => {
      select(b); const s = get(b); b.setPointerCapture(e.pointerId);
      const resizing = e.target === h, x0 = e.clientX, y0 = e.clientY, r0 = b.getBoundingClientRect(), d0 = { dx: s.dx, dy: s.dy };
      const move = ev => {
        const mx = ev.clientX - x0, my = ev.clientY - y0;
        if (resizing) { s.w = Math.max(60, Math.round(r0.width + mx)); s.h = Math.max(24, Math.round(r0.height + my)); }
        else { s.dx = Math.round(d0.dx + mx); s.dy = Math.round(d0.dy + my); }
        apply(b); draw();
      };
      const up = () => { b.removeEventListener("pointermove", move); b.removeEventListener("pointerup", up); save(); };
      b.addEventListener("pointermove", move); b.addEventListener("pointerup", up);
    });
  });
  document.addEventListener("keydown", e => {
    if (!sel || !/^Arrow/.test(e.key) || /INPUT/.test(document.activeElement.tagName)) return;
    e.preventDefault(); const s = get(sel), n = e.shiftKey ? 10 : 1;
    if (e.key === "ArrowLeft") s.dx -= n; if (e.key === "ArrowRight") s.dx += n; if (e.key === "ArrowUp") s.dy -= n; if (e.key === "ArrowDown") s.dy += n;
    apply(sel); save();
  });
  panel.querySelector("#edReset").onclick = () => { state = {}; localStorage.removeItem(KEY); btns.forEach(b => { b.style.cssText = ""; b.classList.remove("ed-off"); }); sel && draw(); save(); msg.textContent = "Voltou ao original."; };
  panel.querySelector("#edSave").onclick = () => { save(); msg.textContent = "Salvo. Pode avisar o Claude."; };
  addEventListener("resize", save);
  save();
})();
