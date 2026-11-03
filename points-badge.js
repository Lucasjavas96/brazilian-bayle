/* Placar de pontos que acompanha quem está logado, no celular e no computador. 1 ponto = 1 giro na roleta do álbum. */
(() => {
  if (!window.BRB || document.querySelector(".pt-float")) return;
  const box = document.createElement("div");
  box.className = "pt-float"; box.hidden = true;
  box.innerHTML = '<button type="button" class="pt-chip" aria-expanded="false" aria-controls="ptPop"><span class="pt-ico" aria-hidden="true">🦜</span><b id="ptN">0</b><span class="pt-lbl mono">pontos</span></button>' +
    '<div class="pt-pop" id="ptPop" hidden role="dialog" aria-label="Seus pontos"><p class="pt-big"><b id="ptN2">0</b> <span id="ptWord">pontos</span></p>' +
    '<p>Cada ponto vale <b>1 giro</b> na roleta do Bayle All Stars Album. Você pode trocar quando quiser.</p>' +
    '<ul><li>Foto no Spotted <b>+5</b></li><li>Comentário no Spotted <b>+1</b></li><li>Avaliar um DJ <b>+3</b></li><li>Resenha na avaliação <b>+5</b></li><li>A cada 5 acertos no quiz <b>+1</b></li></ul>' +
    '<a class="btn btn-y pt-go" href="/album">Girar no álbum</a></div>';
  document.body.appendChild(box);
  const chip = box.querySelector(".pt-chip"), pop = box.querySelector(".pt-pop");
  const set = p => {
    const n = p?.unlimited_spins ? "∞" : String(p?.points ?? 0);
    box.querySelector("#ptN").textContent = n; box.querySelector("#ptN2").textContent = n;
    box.querySelector("#ptWord").textContent = n === "1" ? "ponto" : "pontos";
  };
  const close = () => { pop.hidden = true; chip.setAttribute("aria-expanded", "false"); };
  chip.onclick = () => { pop.hidden = !pop.hidden; chip.setAttribute("aria-expanded", String(!pop.hidden)); };
  document.addEventListener("click", e => { if (!e.target.closest(".pt-float")) close(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
  let rev = 0;
  async function refresh() {
    const my = ++rev;
    try {
      const { data } = await BRB.auth.getSession();
      if (my !== rev) return;
      if (!data?.session?.user) { box.hidden = true; return; }
      const p = await BRB.points();
      if (my !== rev) return;
      set(p); box.hidden = false;
    } catch (e) { /* sem placar se o servidor não responder */ }
  }
  BRB.auth.onAuthStateChange(() => setTimeout(refresh, 0));
  window.addEventListener("brb-points-changed", refresh);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(); });
  setInterval(() => { if (!document.hidden) refresh(); }, 45000);
  refresh();
})();
