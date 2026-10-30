/* Bailinho no site: botão de voltar ao menu e pontos (a cada 5 acertos diferentes, 1 ponto = 1 giro no álbum). */
(function () {
  var back = document.createElement('a');
  back.className = 'qx-back'; back.href = '/'; back.textContent = '← Menu do site';
  back.setAttribute('aria-label', 'Voltar ao menu do site');
  document.body.appendChild(back);

  var toastTimer;
  function toast(text, soft) {
    var old = document.querySelector('.qx-toast'); if (old) old.remove();
    var t = document.createElement('div'); t.className = 'qx-toast' + (soft ? ' soft' : ''); t.setAttribute('role', 'status'); t.textContent = text;
    document.body.appendChild(t); clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.remove(); }, 3600);
  }

  // regra visível no mapa da trilha
  function addRule() {
    var stats = document.querySelector('.mstats');
    if (!stats || document.querySelector('.qx-rule')) return;
    var p = document.createElement('p'); p.className = 'qx-rule';
    p.innerHTML = 'A cada <b>5 acertos</b> você ganha <b>1 ponto</b>, que vale <b>1 giro</b> na roleta do álbum. <a href="/conta?next=/quiz/">Entre na sua conta</a> para ganhar.';
    stats.insertAdjacentElement('afterend', p);
  }

  var warned = false;
  function award(qid) {
    if (!window.BRB || !BRB.quizCorrect) return;
    BRB.quizCorrect(qid).then(function (r) {
      if (!r) return;
      if (r.login === false) { if (!warned) { warned = true; toast('Entre na sua conta para os acertos virarem giros no álbum.', true); } return; }
      if (r.new > 0) toast('+' + r.new + ' ponto! Vale ' + r.new + ' giro' + (r.new > 1 ? 's' : '') + ' no álbum 🦜');
      else toast('Faltam ' + r.next_in + ' acerto' + (r.next_in > 1 ? 's' : '') + ' para o próximo giro.', true);
    }).catch(function () {});
  }

  // detecta o "Correto!" do jogo e a questão atual
  var lastKey = '';
  function onFoot() {
    var v = document.querySelector('#footIn .verdict');
    if (!v || !/^(Correto|Cenário concluído)/.test(v.textContent)) return;
    var m = (document.querySelector('.qcount') || {}).textContent || '';
    var n = (m.match(/Questão\s+(\d+)/) || [])[1]; if (!n) return;
    var qid = 'T1-Q' + String(n).padStart(2, '0');
    var key = qid + '|' + v.textContent + '|' + (document.querySelector('.qcount') || {}).textContent;
    if (key === lastKey) return; lastKey = key;
    award(qid);
  }
  new MutationObserver(function () { addRule(); onFoot(); }).observe(document.body, { childList: true, subtree: true });
  addRule();
})();
