/* Bailinho · Trilha 1. Carrega /quiz/trilha1.json e inicia o jogo. */
fetch("/quiz/trilha1.json").then(r => r.json()).then(d => { window.__BAILINHO_DATA__ = d; start(); }).catch(() => {
  document.body.insertAdjacentHTML("beforeend", '<p style="padding:24px;font-family:sans-serif">Não deu para carregar o quiz agora. Tente de novo em instantes.</p>');
});
function start() {

(function () {
  const DATA = window.__BAILINHO_DATA__;
  const Q = DATA.questions;
  const META = DATA.meta;
  const MAX_HEARTS = 5;
  const PASS = 0.7;
  const $ = id => document.getElementById(id);
  const app = $('app'), foot = $('foot'), footIn = $('footIn');

  // ---------- markdown mínimo ----------
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function inline(s) {
    return esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*(?!\s)(.+?)\*(?!\*)/g, '$1<em>$2</em>');
  }
  function md(text) {
    const L = String(text).split('\n'); let h = '', i = 0;
    const isUl = s => /^\s*- /.test(s), isOl = s => /^\s*\d+\. /.test(s), isT = s => s.trim().startsWith('|');
    while (i < L.length) {
      const l = L[i];
      if (!l.trim()) { i++; continue; }
      if (isT(l)) {
        const rows = []; while (i < L.length && isT(L[i])) rows.push(L[i++].trim());
        const cells = r => r.replace(/^\||\|$/g, '').split('|').map(c => c.trim());
        h += '<div class="tbl"><table><thead><tr>' + cells(rows[0]).map(c => '<th>' + inline(c) + '</th>').join('') +
          '</tr></thead><tbody>' + rows.slice(2).map(r => '<tr>' + cells(r).map(c => '<td>' + inline(c) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>';
        continue;
      }
      if (isUl(l)) { h += '<ul>'; while (i < L.length && isUl(L[i])) h += '<li>' + inline(L[i++].replace(/^\s*- /, '')) + '</li>'; h += '</ul>'; continue; }
      if (isOl(l)) { h += '<ol>'; while (i < L.length && isOl(L[i])) h += '<li>' + inline(L[i++].replace(/^\s*\d+\. /, '')) + '</li>'; h += '</ol>'; continue; }
      const p = []; while (i < L.length && L[i].trim() && !isT(L[i]) && !isUl(L[i]) && !isOl(L[i])) p.push(L[i++]);
      h += '<p>' + inline(p.join(' ')) + '</p>';
    }
    return h;
  }

  // ---------- estado ----------
  let S, I;
  function reset() {
    S = { queue: Q.map((_, i) => i), pos: 0, hearts: MAX_HEARTS, xp: 0, first: {}, done: new Set(), retry: new Set(), level: 0 };
  }
  function setFoot(html, cls) { footIn.innerHTML = html; foot.className = 'foot' + (cls ? ' ' + cls : ''); foot.hidden = false; }
  function hud() {
    $('hearts').textContent = S.hearts; $('xp').textContent = S.xp;
    $('lvl').innerHTML = '<img src="/assets/quiz/papagaio.webp" alt="">Nível ' + Math.min(levelOf(S.done.size) + 1, STATIONS.length);
    const pct = Math.round(S.done.size / Q.length * 100);
    $('barFill').style.width = pct + '%';
    document.querySelector('.bar').setAttribute('aria-valuenow', pct);
  }
  const byId = (arr, id) => arr.find(x => x.id === id);

  // ====================== FORMATOS ======================
  const T = {};

  // ---- verdadeiro ou falso
  T.vf = {
    mount(q, I, root, refresh) {
      I.sel = null;
      root.innerHTML = `<div class="stmt md">${md(q.content.statement)}</div>
        <div class="tfrow"><button class="tf" data-v="true">Verdadeiro</button><button class="tf" data-v="false">Falso</button></div>`;
      root.querySelectorAll('.tf').forEach(b => b.onclick = () => {
        if (I.locked) return; I.sel = b.dataset.v;
        root.querySelectorAll('.tf').forEach(x => x.classList.toggle('sel', x === b)); refresh();
      });
    },
    ready: (q, I) => I.sel !== null,
    grade: (q, I) => ({ ok: (I.sel === 'true') === q.key.answer }),
    lock(q, I, root) {
      root.querySelectorAll('.tf').forEach(b => {
        b.disabled = true; b.classList.remove('sel');
        if ((b.dataset.v === 'true') === q.key.answer) b.classList.add('right'); else if (b.dataset.v === I.sel) b.classList.add('wrong');
      });
    },
    reveal: q => `<p>Resposta certa: <strong>${q.key.answer ? 'Verdadeiro' : 'Falso'}</strong></p>`,
  };

  // ---- completar a frase
  function lacunaSentence(q, fill) {
    return q.content.template.split(/\{(\d+)\}/).map((p, i) => i % 2 === 0 ? inline(p) : fill(+p - 1)).join('');
  }
  T.lacuna = {
    mount(q, I, root, refresh) {
      I.slots = Array(q.key.blanks.length).fill(null);
      const sent = lacunaSentence(q, n => `<button class="slot" data-n="${n}" aria-label="Lacuna ${n + 1}"></button>`);
      root.innerHTML = `<p class="sent">${sent}</p><div class="bank">${q.content.bank.map((w, i) => `<button class="wd" data-i="${i}">${esc(w)}</button>`).join('')}</div>`;
      const draw = () => {
        root.querySelectorAll('.slot').forEach(s => { const v = I.slots[+s.dataset.n]; s.textContent = v === null ? '' : q.content.bank[v]; s.classList.toggle('filled', v !== null); });
        root.querySelectorAll('.wd').forEach(b => b.classList.toggle('ghost', I.slots.includes(+b.dataset.i)));
        refresh();
      };
      root.querySelectorAll('.wd').forEach(b => b.onclick = () => {
        if (I.locked) return; const i = +b.dataset.i; if (I.slots.includes(i)) return;
        const e = I.slots.indexOf(null); if (e < 0) return; I.slots[e] = i; draw();
      });
      root.querySelectorAll('.slot').forEach(s => s.onclick = () => { if (I.locked) return; I.slots[+s.dataset.n] = null; draw(); });
      draw();
    },
    ready: (q, I) => !I.slots.includes(null),
    grade: (q, I) => ({ ok: I.slots.every((v, k) => q.content.bank[v] === q.key.blanks[k]) }),
    lock(q, I, root) {
      root.querySelectorAll('.slot').forEach(s => { const k = +s.dataset.n; s.classList.add(q.content.bank[I.slots[k]] === q.key.blanks[k] ? 'right' : 'wrong'); s.disabled = true; });
      root.querySelectorAll('.wd').forEach(b => b.disabled = true);
    },
    reveal: q => `<p>${lacunaSentence(q, n => `<strong>${esc(q.key.blanks[n])}</strong>`)}</p>`,
  };

  // ---- ligar colunas
  T.ligar = {
    mount(q, I, root, refresh) {
      I.pairs = {}; I.col = {}; I.sel = null;
      const L = q.content.left, R = q.content.right;
      const draw = () => {
        const usedR = {}; Object.keys(I.pairs).forEach(l => usedR[I.pairs[l]] = I.col[l]);
        const item = (side, x, c) => `<button class="li ${c !== undefined ? 'p' + (c + 1) : ''} ${I.sel && I.sel.side === side && I.sel.id === x.id ? 'sel' : ''}" data-side="${side}" data-id="${x.id}">${c !== undefined ? `<span class="pb">${c + 1}</span>` : ''}<span class="tx">${inline(x.text)}</span></button>`;
        root.innerHTML = `<div class="lig"><div class="col">${L.map(x => item('L', x, I.pairs[x.id] ? I.col[x.id] : undefined)).join('')}</div><div class="col">${R.map(x => item('R', x, usedR[x.id])).join('')}</div></div>`;
        refresh();
      };
      I.draw = draw;
      root.onclick = e => {
        const b = e.target.closest('.li'); if (!b || I.locked) return;
        const side = b.dataset.side, id = b.dataset.id;
        if (side === 'L' && I.pairs[id]) { delete I.pairs[id]; delete I.col[id]; I.sel = null; return draw(); }
        if (side === 'R') { const l = Object.keys(I.pairs).find(k => I.pairs[k] === id); if (l) { delete I.pairs[l]; delete I.col[l]; I.sel = null; return draw(); } }
        if (I.sel && I.sel.side !== side) {
          const l = side === 'L' ? id : I.sel.id, r = side === 'R' ? id : I.sel.id;
          const used = Object.values(I.col); let c = 0; while (used.includes(c)) c++;
          I.pairs[l] = r; I.col[l] = c; I.sel = null; return draw();
        }
        I.sel = { side, id }; draw();
      };
      draw();
    },
    ready: (q, I) => Object.keys(I.pairs).length === q.content.left.length,
    grade: (q, I) => ({ ok: q.content.left.every(l => I.pairs[l.id] === q.key.pairs[l.id]) }),
    lock(q, I, root) {
      root.onclick = null;
      root.querySelectorAll('.li').forEach(b => {
        b.disabled = true; b.classList.remove('sel');
        const l = b.dataset.side === 'L' ? b.dataset.id : Object.keys(I.pairs).find(k => I.pairs[k] === b.dataset.id);
        b.classList.add(I.pairs[l] === q.key.pairs[l] ? 'right' : 'wrong');
      });
    },
    reveal: q => '<ul>' + q.content.left.map(l => `<li>${inline(l.text)} <strong>↔</strong> ${inline(byId(q.content.right, q.key.pairs[l.id]).text)}</li>`).join('') + '</ul>',
  };

  // ---- ordenar
  T.ordenar = {
    mount(q, I, root, refresh) {
      I.order = [];
      const items = q.content.items;
      const draw = () => {
        const rest = items.filter(x => !I.order.includes(x.id));
        root.innerHTML = `<div class="olabel">Sua sequência</div><ol class="seq">${I.order.length ? I.order.map((id, k) => `<li><button class="step placed" data-id="${id}"><span class="sn">${k + 1}</span><span>${inline(byId(items, id).text)}</span></button></li>`).join('') : '<li class="ph">Toque nos passos abaixo, na ordem certa</li>'}</ol>
          <div class="olabel">Passos</div><div class="pool">${rest.length ? rest.map(x => `<button class="step" data-id="${x.id}"><span>${inline(x.text)}</span></button>`).join('') : '<div class="empty">Todos os passos foram colocados.</div>'}</div>`;
        root.querySelectorAll('.step').forEach(b => b.onclick = () => {
          if (I.locked) return; const id = b.dataset.id;
          if (I.order.includes(id)) I.order = I.order.filter(x => x !== id); else I.order.push(id);
          draw();
        });
        refresh();
      };
      draw();
    },
    ready: (q, I) => I.order.length === q.content.items.length,
    grade: (q, I) => ({ ok: I.order.every((id, k) => id === q.key.order[k]) }),
    lock(q, I, root) {
      root.querySelectorAll('.seq .step').forEach((b, k) => { b.disabled = true; b.classList.add(I.order[k] === q.key.order[k] ? 'right' : 'wrong'); });
    },
    reveal: q => '<ol>' + q.key.order.map(id => `<li>${inline(byId(q.content.items, id).text)}</li>`).join('') + '</ol>',
  };

  // ---- cálculo digitado
  function parseNum(v) {
    let s = String(v).replace(/R\$|%|\s/g, '');
    if (!s) return NaN;
    if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
    return /^-?\d+(\.\d+)?$/.test(s) ? parseFloat(s) : NaN;
  }
  T.digitado = {
    mount(q, I, root, refresh) {
      I.val = '';
      const c = q.content;
      root.innerHTML = `<label class="numfield" id="nf">${esc(c.prefix)}<input id="num" type="text" inputmode="decimal" autocomplete="off" placeholder="${esc(c.placeholder)}" aria-label="Sua resposta">${esc(c.suffix)}</label><div class="numhint">Pode usar vírgula ou ponto.</div>`;
      const inp = $('num'); inp.oninput = () => { I.val = inp.value; refresh(); };
      setTimeout(() => inp.focus({ preventScroll: true }), 50);
    },
    ready: (q, I) => !isNaN(parseNum(I.val)),
    grade(q, I) {
      const n = parseNum(I.val); const ok = Math.abs(n - q.key.answer) <= (q.key.tolerance || 0) + 1e-9;
      let note = '';
      if (!ok && q.wrong_feedback) { const k = Object.keys(q.wrong_feedback).find(x => Math.abs(parseFloat(x) - n) < 1e-9); if (k !== undefined) note = q.wrong_feedback[k]; }
      return { ok, note };
    },
    lock(q, I, root, res) { const inp = $('num'); inp.disabled = true; $('nf').classList.add(res.ok ? 'right' : 'wrong'); },
    reveal: q => `<p>Resposta certa: <strong>${esc(q.key.display)}</strong></p>`,
  };

  // ---- classificar
  T.classificar = {
    mount(q, I, root, refresh) {
      I.place = {}; I.sel = null;
      const cards = q.content.cards, boxes = q.content.boxes;
      const draw = () => {
        const pool = cards.filter(c => !I.place[c.id]);
        root.innerHTML = `<div class="olabel">Cartões</div><div class="cards">${pool.length ? pool.map(c => `<button class="card ${I.sel === c.id ? 'sel' : ''}" data-card="${c.id}">${inline(c.text)}</button>`).join('') : '<div class="empty">Todos os cartões foram colocados.</div>'}</div>
          <div class="boxes">${boxes.map(b => { const mine = cards.filter(c => I.place[c.id] === b.id);
            return `<div class="bx ${I.sel ? 'armed' : ''}" data-box="${b.id}"><div class="bxh">${esc(b.label)}</div><div class="bxc">${mine.length ? mine.map(c => `<button class="card" data-placed="${c.id}">${inline(c.text)}</button>`).join('') : '<div class="empty">Vazia</div>'}</div></div>`; }).join('')}</div>`;
        refresh();
      };
      root.onclick = e => {
        if (I.locked) return;
        const pl = e.target.closest('[data-placed]'); if (pl) { delete I.place[pl.dataset.placed]; I.sel = null; return draw(); }
        const cd = e.target.closest('[data-card]'); if (cd) { I.sel = I.sel === cd.dataset.card ? null : cd.dataset.card; return draw(); }
        const bx = e.target.closest('[data-box]'); if (bx && I.sel) { I.place[I.sel] = bx.dataset.box; I.sel = null; draw(); }
      };
      draw();
    },
    ready: (q, I) => q.content.cards.every(c => I.place[c.id]),
    grade: (q, I) => ({ ok: q.content.cards.every(c => I.place[c.id] === q.key.map[c.id]) }),
    lock(q, I, root) {
      root.onclick = null;
      root.querySelectorAll('[data-placed]').forEach(b => { b.disabled = true; b.classList.add(I.place[b.dataset.placed] === q.key.map[b.dataset.placed] ? 'right' : 'wrong'); });
      root.querySelectorAll('.bx').forEach(b => b.classList.remove('armed'));
    },
    reveal: q => q.content.boxes.map(b => `<p><strong>${esc(b.label)}:</strong></p><ul>${q.content.cards.filter(c => q.key.map[c.id] === b.id).map(c => `<li>${inline(c.text)}</li>`).join('')}</ul>`).join(''),
  };

  // ---- encontre o erro
  T.erro = {
    mount(q, I, root, refresh) {
      I.sel = null;
      root.innerHTML = `<div class="chunks">${q.content.chunks.map(c => `<button class="chunk" data-id="${c.id}">${inline(c.text)}</button>`).join('')}</div>`;
      root.querySelectorAll('.chunk').forEach(b => b.onclick = () => {
        if (I.locked) return; I.sel = b.dataset.id;
        root.querySelectorAll('.chunk').forEach(x => x.classList.toggle('sel', x === b)); refresh();
      });
    },
    ready: (q, I) => I.sel !== null,
    grade: (q, I) => ({ ok: I.sel === q.key.wrong }),
    lock(q, I, root) {
      root.querySelectorAll('.chunk').forEach(b => {
        b.disabled = true; b.classList.remove('sel');
        if (b.dataset.id === q.key.wrong) { b.classList.add('right'); b.insertAdjacentHTML('afterbegin', '<span class="tagr">Este era o erro</span><br>'); }
        else if (b.dataset.id === I.sel) { b.classList.add('wrong'); b.insertAdjacentHTML('afterbegin', '<span class="tagr">Este trecho estava certo</span><br>'); }
      });
    },
    reveal: q => `<p>O trecho errado era: <em>${esc(byId(q.content.chunks, q.key.wrong).text)}</em></p>`,
  };

  // ---- montar a frase
  T.frase = {
    mount(q, I, root, refresh) {
      I.line = [];
      const bank = q.content.bank;
      const draw = () => {
        const rest = bank.filter(w => !I.line.includes(w.id));
        root.innerHTML = `<div class="olabel">Sua frase</div><div class="line">${I.line.length ? I.line.map(id => `<button class="wd" data-id="${id}">${esc(byId(bank, id).text)}</button>`).join('') : '<span class="ph">Toque nas palavras abaixo, na ordem certa</span>'}</div>
          <div class="olabel">Palavras</div><div class="bank">${rest.map(w => `<button class="wd" data-id="${w.id}">${esc(w.text)}</button>`).join('')}</div>`;
        root.querySelectorAll('.wd').forEach(b => b.onclick = () => {
          if (I.locked) return; const id = b.dataset.id;
          if (I.line.includes(id)) I.line = I.line.filter(x => x !== id); else I.line.push(id);
          draw();
        });
        refresh();
      };
      draw();
    },
    ready: (q, I) => I.line.length > 0,
    grade(q, I) {
      const want = q.key.order.map(id => byId(q.content.bank, id).text), got = I.line.map(id => byId(q.content.bank, id).text);
      return { ok: want.length === got.length && want.every((t, k) => t === got[k]) };
    },
    lock(q, I, root) {
      const want = q.key.order.map(id => byId(q.content.bank, id).text);
      root.querySelectorAll('.line .wd').forEach((b, k) => { b.disabled = true; b.classList.add(byId(q.content.bank, I.line[k]).text === want[k] ? 'right' : 'wrong'); });
      root.querySelectorAll('.bank .wd').forEach(b => b.disabled = true);
    },
    reveal: q => `<p><strong>${esc(q.key.sentence)}</strong></p>`,
  };

  // ---- leitura de tabela
  T.leitura = {
    mount(q, I, root, refresh) {
      I.sel = null;
      const rowMode = q.key.row !== undefined; I.rowMode = rowMode;
      const c = q.content;
      root.innerHTML = `<div class="tbl"><table class="lt"><thead><tr>${c.head.map(h => `<th>${inline(h)}</th>`).join('')}</tr></thead><tbody>${c.rows.map((r, ri) => `<tr data-r="${ri}">${r.map((cell, ci) => (ci === 0 && !rowMode) ? `<th scope="row">${inline(cell)}</th>` : `<td data-c="${ci}"><button class="tc" data-r="${ri}" data-c="${ci}">${inline(cell)}</button></td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
      root.querySelectorAll('.tc').forEach(b => b.onclick = () => {
        if (I.locked) return; I.sel = [+b.dataset.r, +b.dataset.c];
        root.querySelectorAll('tr.sel').forEach(x => x.classList.remove('sel')); root.querySelectorAll('td.sel').forEach(x => x.classList.remove('sel'));
        if (rowMode) b.closest('tr').classList.add('sel'); else b.closest('td').classList.add('sel');
        refresh();
      });
    },
    ready: (q, I) => I.sel !== null,
    grade(q, I) { return { ok: I.rowMode ? I.sel[0] === q.key.row : (I.sel[0] === q.key.cell[0] && I.sel[1] === q.key.cell[1]) }; },
    lock(q, I, root) {
      root.querySelectorAll('.tc').forEach(b => b.disabled = true);
      root.querySelectorAll('.sel').forEach(x => x.classList.remove('sel'));
      if (I.rowMode) {
        root.querySelector(`tr[data-r="${q.key.row}"]`).classList.add('right');
        if (I.sel[0] !== q.key.row) root.querySelector(`tr[data-r="${I.sel[0]}"]`).classList.add('wrong');
      } else {
        root.querySelector(`tr[data-r="${q.key.cell[0]}"] td[data-c="${q.key.cell[1]}"]`).classList.add('right');
        if (!(I.sel[0] === q.key.cell[0] && I.sel[1] === q.key.cell[1])) root.querySelector(`tr[data-r="${I.sel[0]}"] td[data-c="${I.sel[1]}"]`).classList.add('wrong');
      }
    },
    reveal(q) {
      if (q.key.row !== undefined) return `<p>Linha certa: <strong>${esc(q.content.rows[q.key.row][0])}</strong></p>`;
      const [r, c] = q.key.cell; return `<p>Célula certa: <strong>${esc(q.content.rows[r][0])}</strong>, ${esc(q.content.head[c])}: <strong>${esc(q.content.rows[r][c])}</strong></p>`;
    },
  };

  // ---- escolha rápida (Bailinho): uma pergunta curta e poucas opções curtas, toque e pronto
  T.escolha = {
    mount(q, I, root, refresh) {
      I.sel = null;
      root.innerHTML = `<div class="opts big" role="radiogroup">${q.content.options.map((o, k) => `<button class="opt" role="radio" aria-checked="false" data-id="${o.id}"><span class="k">${'ABCD'[k]}</span><span class="t">${inline(o.text)}</span></button>`).join('')}</div>`;
      root.querySelectorAll('.opt').forEach(b => b.onclick = () => {
        if (I.locked) return; I.sel = b.dataset.id;
        root.querySelectorAll('.opt').forEach(x => { const on = x === b; x.classList.toggle('sel', on); x.setAttribute('aria-checked', on); }); refresh();
      });
    },
    ready: (q, I) => I.sel !== null,
    grade: (q, I) => ({ ok: I.sel === q.key.answer, note: I.sel === q.key.answer ? '' : (q.key.feedback || {})[I.sel] }),
    lock(q, I, root) {
      root.querySelectorAll('.opt').forEach(b => {
        b.disabled = true; b.classList.remove('sel');
        if (b.dataset.id === q.key.answer) b.classList.add('right'); else if (b.dataset.id === I.sel) b.classList.add('wrong');
      });
    },
    reveal: q => `<p><strong>${inline(q.content.options.find(o => o.id === q.key.answer).text)}</strong></p>`,
  };

  // ---- cenário em etapas
  T.cenario = {
    mount(q, I, root, refresh) { I.step = 0; I.res = []; I.sel = null; I.stepLocked = false; I.root = root; I.refresh = refresh; T.cenario.draw(q, I); },
    draw(q, I) {
      const st = q.content.steps[I.step], n = q.content.steps.length;
      const dots = q.content.steps.map((_, k) => `<i class="${k < I.res.length ? (I.res[k] ? 'ok' : 'bad') : (k === I.step ? 'now' : '')}"></i>`).join('');
      I.root.innerHTML = `<div class="intro md">${md(q.content.intro)}</div><div class="stepbar" aria-label="Etapas">${dots}</div>
        <div class="stepq md"><p><strong>Etapa ${I.step + 1} de ${n}.</strong></p>${md(st.prompt)}</div>
        <div class="opts" role="radiogroup">${st.options.map((o, k) => `<button class="opt" role="radio" aria-checked="false" data-id="${o.id}"><span class="k">${'ABCD'[k]}</span><span class="t">${inline(o.text)}</span></button>`).join('')}</div>`;
      I.root.querySelectorAll('.opt').forEach(b => b.onclick = () => {
        if (I.stepLocked) return; I.sel = b.dataset.id;
        I.root.querySelectorAll('.opt').forEach(x => { const on = x === b; x.classList.toggle('sel', on); x.setAttribute('aria-checked', on); }); I.refresh();
      });
    },
    ready: (q, I) => I.sel !== null && !I.stepLocked,
  };
  function checkStep() {
    const q = I.q, st = q.content.steps[I.step], k = q.key.steps[I.step];
    const ok = I.sel === k.answer; I.res.push(ok); I.stepLocked = true;
    I.root.querySelectorAll('.opt').forEach(b => { b.disabled = true; b.classList.remove('sel'); if (b.dataset.id === k.answer) b.classList.add('right'); else if (b.dataset.id === I.sel) b.classList.add('wrong'); });
    const dots = I.root.querySelectorAll('.stepbar i'); dots[I.step].className = ok ? 'ok' : 'bad';
    const last = I.step === q.content.steps.length - 1;
    let verdict = ok ? 'Correto!' : 'Não foi essa. A certa está em verde.';
    let cls = ok ? 'ok' : 'bad';
    if (last) {
      const all = I.res.every(Boolean);
      if (!(I.idx in S.first)) S.first[I.idx] = all;
      if (all) { S.xp += 10; S.done.add(I.idx); verdict = 'Cenário concluído! +10 XP'; cls = 'ok'; }
      else { S.hearts -= 1; S.retry.add(I.idx); S.queue.push(I.idx); verdict = 'Cenário concluído com erro. −1 vida; ele volta no fim'; cls = 'bad'; }
      hud();
    }
    const why = ok ? '' : `<h4>Por que a sua escolha não serve</h4><div class="md">${md(k.feedback[I.sel])}</div>`;
    const sum = last ? `<h4>Resumo do cenário</h4><div class="md">${md(q.explanation)}</div>` : '';
    setFoot(`<div class="verdict">${verdict}</div><div class="fb">${why}<h4>Explicação</h4><div class="md">${md(k.explanation)}</div>${sum}</div>
      <button class="btn wide" id="next">${last ? (S.hearts <= 0 ? 'Ver resultado' : 'Continuar') : 'Próxima etapa'}</button>`, cls);
    $('next').onclick = () => {
      if (!last) { I.step += 1; I.sel = null; I.stepLocked = false; T.cenario.draw(q, I); setFoot(`<button class="btn wide" id="check" disabled>Verificar</button>`); $('check').onclick = check; refresh(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
      else { S.pos += 1; levelGate(question); }
    };
    $('next').focus({ preventScroll: true });
  }

  // ====================== FLUXO ======================
  function refresh() { const b = $('check'); if (b && I) b.disabled = !T[I.q.type].ready(I.q, I); }

  function question() {
    if (S.hearts <= 0) return outOfHearts();
    if (S.pos >= S.queue.length) return finish();
    const idx = S.queue[S.pos], q = Q[idx];
    I = { locked: false, q, idx };
    const isRetry = S.retry.has(idx);
    hud();
    app.innerHTML = `
      <section class="screen">
        <div class="qmeta">
          <span class="chip">${esc(q.type_label)}</span>
          ${isRetry ? '<span class="chip review">Revisão de erro</span>' : ''}
          <span class="qcount">Questão ${idx + 1} de ${Q.length} · nível ${q.difficulty}</span>
        </div>
        <details class="support">
          <summary>Dica</summary>
          <div class="body md">${md(q.support_text)}</div>
        </details>
        <div class="prompt md">${md(q.prompt)}</div>
        <div id="play"></div>
      </section>`;
    T[q.type].mount(q, I, $('play'), refresh);
    setFoot(`<button class="btn wide" id="check" disabled>Verificar</button>`);
    $('check').onclick = check;
    refresh();
    window.scrollTo({ top: 0 });
  }

  function check() {
    const q = I.q, t = T[q.type];
    if (I.locked || !t.ready(q, I)) return;
    if (q.type === 'cenario') return checkStep();
    I.locked = true;
    const res = t.grade(q, I); t.lock(q, I, $('play'), res);
    if (!(I.idx in S.first)) S.first[I.idx] = res.ok;
    if (res.ok) { S.xp += 10; S.done.add(I.idx); } else { S.hearts -= 1; S.retry.add(I.idx); S.queue.push(I.idx); }
    hud();
    const ans = res.ok ? '' : `<h4>Resposta certa</h4><div class="md">${t.reveal(q)}</div>`;
    const note = (!res.ok && res.note) ? `<h4>Por que a sua resposta não serve</h4><div class="md">${md(res.note)}</div>` : '';
    setFoot(`<div class="verdict">${res.ok ? 'Correto! +10 XP' : 'Não foi dessa vez'}</div>
      <div class="fb">${ans}${note}<h4>Explicação</h4><div class="md">${md(q.explanation)}</div></div>
      <button class="btn wide" id="next">${S.hearts <= 0 ? 'Ver resultado' : 'Continuar'}</button>`, res.ok ? 'ok' : 'bad');
    $('next').onclick = () => { S.pos += 1; levelGate(question); };
    $('next').focus({ preventScroll: true });
  }

  // ---------- Bailinho: a trilha é uma pista de dança e o papagaio sobe de nível ----------
  // Estações por ordem das questões (nível 1 a 5 da progressão do kit).
  const STATIONS = [
    { name: 'Na fila', sub: 'O papagaio chega na porta', to: 5 },
    { name: 'Na pista', sub: 'Primeiros passos de dança', to: 10 },
    { name: 'No meio da galera', sub: 'Já sabe o que está tocando', to: 15 },
    { name: 'Na grade', sub: 'Colado no palco', to: 19 },
    { name: 'Na cabine', sub: 'Do lado do DJ', to: 20 },
  ];
  const STORE = 'bailinho_' + (META.topic ? 'trilha' + META.topic.number : 'trilha');
  const best = () => { try { return +localStorage.getItem(STORE) || 0; } catch (e) { return 0; } };
  const saveBest = n => { try { if (n > best()) localStorage.setItem(STORE, String(n)); } catch (e) {} };
  const levelOf = n => STATIONS.filter(s => n >= s.to).length; // estações completas
  const PARROT = '/assets/quiz/papagaio.webp';

  function intro() {
    $('top').hidden = true;
    const reached = Math.min(best(), Q.length);
    let from = 0;
    const blocks = STATIONS.map((s, si) => {
      const qs = Q.slice(from, s.to).map((q, k) => ({ q, i: from + k })); from = s.to;
      const unlocked = reached >= (si ? STATIONS[si - 1].to : 0);
      const nodes = qs.map(({ q, i }) => {
        const x = Math.round(Math.sin((i + 1) * 1.15) * 70);
        const cls = i < reached ? 'done' : i === reached ? 'now' : '';
        const here = i === reached ? `<img class="parrot" src="${PARROT}" alt=""><span class="here">Você está aqui</span>` : '';
        return `<button class="node ${cls}${i === Q.length - 1 ? ' boss' : ''}${x < 0 ? ' left' : ''}" style="--x:${x}px" data-i="${i}" aria-label="Questão ${i + 1}: ${esc(q.type_label)}">${here}<span class="disc">${i + 1}</span><span class="ttl">${esc(q.type_label)}</span></button>`;
      }).reverse().join('');
      return `<div class="station${unlocked ? '' : ' locked'}${si === STATIONS.length - 1 ? ' top' : ''}"><span class="sign">Nível ${si + 1} · ${esc(s.name)}</span><small>${esc(s.sub)}</small></div><div class="nodes">${nodes}</div>`;
    }).reverse().join('');
    const done = reached >= Q.length ? `<img class="parrot" src="${PARROT}" alt="" style="position:relative;left:auto;bottom:auto;margin:0 auto;display:block;width:64px">` : '';
    app.innerHTML = `
      <section class="map screen">
        <div class="map-head"><img src="/assets/quiz/logo.webp" alt="Brazilian Bayle"><span class="eyebrow">${esc(META.course)} · Trilha ${META.topic.number}</span></div>
        <h1>${esc(META.topic.title).replace(/:(.*)$/, ':<em>$1</em>')}</h1>
        <p>Ajude o papagaio da Bayle a sair da fila e chegar na cabine. ${Q.length} desafios rápidos de música eletrônica: bateu o olho, tocou, pronto.</p>
        <div class="mstats">
          <div><b>${Q.length}</b><span>desafios</span></div>
          <div><b>${MAX_HEARTS} vidas</b><span>cada erro custa uma</span></div>
          <div><b>${Math.round(PASS * 100)}%</b><span>para passar de trilha</span></div>
        </div>
        <div class="floor"><span class="ball" aria-hidden="true"></span>${done}${blocks}</div>
        <div class="legend2"><span><i style="background:var(--accent)"></i>concluída</span><span><i style="background:#fff"></i>próxima</span><span><i style="background:#2a2d29"></i>a liberar</span></div>
      </section>`;
    setFoot(`<button class="btn wide" id="start">${reached ? (reached >= Q.length ? 'Jogar de novo' : 'Continuar a trilha') : 'Entrar na pista'}</button><button class="btn ghost wide" id="conf">Modo conferência (ver todas as respostas)</button><p class="hint">Atalho: Enter verifica e continua.</p>`);
    $('start').onclick = () => { reset(); $('top').hidden = false; question(); };
    $('conf').onclick = () => { location.hash = '#c1'; };
    app.querySelectorAll('.node').forEach(b => b.onclick = () => { if (b.classList.contains('done') || b.classList.contains('now')) $('start').click(); });
    const now = app.querySelector('.node.now'); if (now) now.scrollIntoView({ block: 'center' });
  }

  // Ao fechar uma estação, o papagaio sobe de nível (tela de comemoração antes da próxima questão).
  function levelGate(next) {
    const lv = levelOf(S.done.size);
    saveBest(S.done.size);
    if (lv <= S.level || lv >= STATIONS.length + 1) { S.level = Math.max(S.level, lv); return next(); }
    S.level = lv;
    const nx = STATIONS[Math.min(lv, STATIONS.length - 1)], finished = lv >= STATIONS.length;
    const ov = document.createElement('div'); ov.className = 'lvlup'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'Subiu de nível');
    ov.innerHTML = `<div class="box"><img src="${PARROT}" alt=""><span class="k">Subiu de nível</span>
      <h2>${finished ? 'Chegou na cabine!' : 'Nível ' + (lv + 1) + ' · ' + esc(nx.name)}</h2>
      <p>${finished ? 'O papagaio da Bayle terminou a trilha.' : esc(nx.sub) + '.'}</p>
      <button class="btn wide" id="lvlgo">Continuar</button></div>`;
    document.body.appendChild(ov);
    const cf = document.createElement('div'); cf.className = 'confetti';
    cf.innerHTML = Array.from({ length: 40 }, (_, i) => `<i style="left:${(i * 37) % 100}%;background:${['#FFD400', '#009C3B', '#2a5bd7', '#fff'][i % 4]};animation-delay:${(i % 10) * .08}s"></i>`).join('');
    document.body.appendChild(cf);
    const go = () => { ov.remove(); cf.remove(); next(); };
    ov.querySelector('#lvlgo').onclick = go; ov.querySelector('#lvlgo').focus();
  }

  function summary(title, sub) {
    $('top').hidden = true;
    const right = Object.values(S.first).filter(Boolean).length;
    const pct = Math.round(right / Q.length * 100);
    const passed = right / Q.length >= PASS;
    const recap = Q.map((q, i) => {
      const r = S.first[i];
      const mark = r === undefined ? '<span class="mark">·</span>' : r ? '<span class="mark ok">✓</span>' : '<span class="mark bad">✗</span>';
      return `<div>${mark}<span><b>Exercício ${i + 1}</b> · ${esc(q.type_label)}</span></div>`;
    }).join('');
    app.innerHTML = `
      <section class="hero screen">
        <span class="eyebrow">Trilha ${META.topic.number} · resultado</span>
        <h1>${title}</h1>
        <p>${sub}</p>
        <div class="score">
          <div class="rule"><b class="${passed ? 'pass' : 'fail'}">${pct}%</b><span>acertos na 1ª tentativa (${right} de ${Q.length})</span></div>
          <div class="rule"><b>${S.xp} XP</b><span>ganhos na lição</span></div>
          <div class="rule"><b>${S.hearts} de ${MAX_HEARTS}</b><span>vidas restantes</span></div>
        </div>
        <div class="recap">${recap}</div>
      </section>`;
    setFoot(`<button class="btn wide" id="again">Refazer a lição</button><button class="btn ghost wide" id="home">Voltar ao início</button>`);
    $('again').onclick = () => { reset(); $('top').hidden = false; question(); };
    saveBest(S.done.size);
    $('home').onclick = intro;
  }
  function finish() {
    const right = Object.values(S.first).filter(Boolean).length;
    const passed = right / Q.length >= PASS;
    summary(passed ? 'Trilha concluída. Bayle fino!' : 'Trilha concluída, ainda sem aprovação',
      passed ? 'Você passou da nota mínima de 70% na primeira tentativa. A próxima trilha está liberada.'
             : 'A aprovação exige 70% de acertos na primeira tentativa. Revise os desafios marcados com ✗ e refaça a trilha.');
  }
  function outOfHearts() {
    summary('Suas vidas acabaram', 'Você errou ' + MAX_HEARTS + ' vezes nesta lição. Revise as explicações e tente de novo: os exercícios errados são os pontos que mais valem a revisão.');
  }

  // ====================== MODO CONFERÊNCIA ======================
  function autoSolve(q) {
    const k = q.key, c = q.content, $q = s => document.querySelector(s), $$q = s => Array.from(document.querySelectorAll(s));
    switch (q.type) {
      case 'vf': $q('.tf[data-v="' + k.answer + '"]').click(); break;
      case 'lacuna': k.blanks.forEach(w => { $$q('.wd').find(x => x.textContent === w && !x.classList.contains('ghost')).click(); }); break;
      case 'ligar': c.left.forEach(l => { $q('.li[data-side="L"][data-id="' + l.id + '"]').click(); $q('.li[data-side="R"][data-id="' + k.pairs[l.id] + '"]').click(); }); break;
      case 'ordenar': k.order.forEach(id => $q('.pool .step[data-id="' + id + '"]').click()); break;
      case 'digitado': { const i = $q('#num'); i.value = String(k.answer).replace('.', ','); i.dispatchEvent(new Event('input')); break; }
      case 'classificar': Object.keys(k.map).forEach(id => { $q('[data-card="' + id + '"]').click(); $q('[data-box="' + k.map[id] + '"]').click(); }); break;
      case 'erro': $q('.chunk[data-id="' + k.wrong + '"]').click(); break;
      case 'escolha': $q('.opt[data-id="' + k.answer + '"]').click(); break;
      case 'frase': k.order.forEach(id => $q('.bank .wd[data-id="' + id + '"]').click()); break;
      case 'leitura': if (k.row !== undefined) $q('.tc[data-r="' + k.row + '"][data-c="0"]').click(); else $q('.tc[data-r="' + k.cell[0] + '"][data-c="' + k.cell[1] + '"]').click(); break;
    }
  }
  function scenarioReview(q, root) {
    const n = q.content.steps.length;
    root.innerHTML = '<div class="intro md">' + md(q.content.intro) + '</div>' + q.content.steps.map((st, k) => {
      const ks = q.key.steps[k];
      return '<div class="stepq md"><p><strong>Etapa ' + (k + 1) + ' de ' + n + '.</strong></p>' + md(st.prompt) + '</div><div class="opts">' +
        st.options.map((o, j) => '<div class="opt static ' + (o.id === ks.answer ? 'right' : '') + '"><span class="k">' + 'ABCD'[j] + '</span><span class="t">' + inline(o.text) +
          (o.id === ks.answer ? '' : '<div class="why"><strong>Por que não:</strong> ' + inline(ks.feedback[o.id]) + '</div>') + '</span></div>').join('') +
        '</div><div class="rvnote md"><strong>Explicação da etapa.</strong>' + md(ks.explanation) + '</div>';
    }).join('');
  }
  function review(i) {
    i = Math.max(0, Math.min(Q.length - 1, i));
    const q = Q[i]; I = { locked: false, q, idx: i };
    $('top').hidden = true;
    const opts = Q.map((x, k) => '<option value="' + k + '"' + (k === i ? ' selected' : '') + '>' + (k + 1) + ' · ' + esc(x.type_label) + '</option>').join('');
    app.innerHTML = '<div class="rvbar"><span class="chip">Modo conferência</span><label>Ir para <select id="jump">' + opts + '</select></label><button class="btn ghost small" id="asStudent">Fazer como aluno</button></div>' +
      '<section class="screen"><div class="qmeta"><span class="chip">' + esc(q.type_label) + '</span><span class="qcount">Questão ' + (i + 1) + ' de ' + Q.length + ' · nível ' + q.difficulty + '</span></div>' +
      '<details class="support" open><summary>Dica</summary><div class="body md">' + md(q.support_text) + '</div></details>' +
      '<div class="prompt md">' + md(q.prompt) + '</div><div id="play"></div><div class="gab" id="gab"></div></section>';
    const play = $('play');
    if (q.type === 'cenario') scenarioReview(q, play);
    else { T[q.type].mount(q, I, play, function () {}); autoSolve(q); I.locked = true; const res = T[q.type].grade(q, I); T[q.type].lock(q, I, play, res); }
    let extra = '';
    if (q.type === 'digitado' && q.wrong_feedback) extra = '<h4>Erros comuns e o aviso que o aluno recebe</h4><ul>' + Object.keys(q.wrong_feedback).map(k => '<li><strong>' + esc(k.replace('.', ',')) + ':</strong> ' + inline(q.wrong_feedback[k]) + '</li>').join('') + '</ul>';
    const ans = q.type === 'cenario' ? '' : '<h4>Resposta certa</h4><div class="md">' + T[q.type].reveal(q) + '</div>';
    $('gab').innerHTML = '<div class="verdict">Gabarito</div>' + ans + '<h4>Explicação</h4><div class="md">' + md(q.explanation) + '</div>' + extra;
    setFoot('<div class="navrow"><button class="btn ghost" id="prevq"' + (i === 0 ? ' disabled' : '') + '>← Anterior</button><button class="btn" id="nextq"' + (i === Q.length - 1 ? ' disabled' : '') + '>Próxima →</button></div>', '');
    $('prevq').onclick = () => { location.hash = '#c' + i; };
    $('nextq').onclick = () => { location.hash = '#c' + (i + 2); };
    $('jump').onchange = e => { location.hash = '#c' + (+e.target.value + 1); };
    $('asStudent').onclick = () => { history.replaceState(null, '', location.pathname + location.search); intro(); };
    window.scrollTo({ top: 0 });
  }
  window.addEventListener('hashchange', () => { const m = location.hash.match(/^#c(\d+)$/); if (m) review(+m[1] - 1); });

  $('quit').onclick = intro;
  document.addEventListener('keydown', e => {
    if (document.querySelector('.rvbar') && (e.key === 'ArrowRight' || e.key === 'ArrowLeft') && e.target.tagName !== 'SELECT' && e.target.tagName !== 'INPUT') { const b = $(e.key === 'ArrowRight' ? 'nextq' : 'prevq'); if (b && !b.disabled) { b.click(); e.preventDefault(); } return; }
    if ($('top').hidden || e.altKey || e.ctrlKey || e.metaKey || e.key !== 'Enter') return;
    const tg = e.target; if (tg.tagName === 'BUTTON' || tg.tagName === 'SUMMARY') return;
    const nx = $('next'), ck = $('check');
    if (nx) { nx.click(); e.preventDefault(); } else if (ck && !ck.disabled) { ck.click(); e.preventDefault(); }
  });

  const START_MODE = 'lesson';
  const hm = location.hash.match(/^#c(\d+)$/);
  if (hm) review(+hm[1] - 1); else if (START_MODE === 'review') review(0); else intro();
})();

}
