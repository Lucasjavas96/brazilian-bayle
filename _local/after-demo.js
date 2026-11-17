/* Só no computador (node _local/server.js): modo demonstração do "Onde é o after?".
   Troca o backend por dados de mentira, para testar vitrine, reserva, Pix, anúncio e análise sem tocar no Supabase.
   Abrir /after (demo) ou /after?real para usar o backend de verdade. */
(() => {
  const F = n => "/assets/" + n;
  const it = o => Object.assign({ nome: "", festa: "Brazilian Bayle, a Festa", bairro: "Centro", hora: "Dom, 06/12 · 04h00", vagas: 10, ocupadas: 0, modo: "livre", desc: "", regras: "", fotos: [], comodidades: [], preco_cents: 0,
    status: "aberto", host: "lucasjavas", notas: [], endereco: null, my: null, reqs: [], motivo: "", vendas: null, my_hold: null }, o);
  const N = (s, e, f) => ({ som: s, espaco: e, fraternidade: f });
  const st = { me_mod: true, items: [
    it({ id: "00000000-0000-4000-8000-000000000001", nome: "Rooftop do Centro", ocupadas: 3, desc: "Som no talo até o sol nascer. Vista pro centro inteiro.", fotos: [F("real-after-5-800.webp"), F("real-after-4-800.webp"), F("real-trio-800.webp"), F("real-after-1-800.webp"), F("real-after-2-800.webp")],
      comodidades: ["som", "dj", "byob", "externa", "chill"], preco_cents: 4000, regras: "Sem vidro na área externa.", notas: [N(5, 5, 4), N(5, 4, 5), N(4, 5, 5)] }),
    it({ id: "00000000-0000-4000-8000-000000000002", nome: "Casa do Bigorrilho", bairro: "Bigorrilho", fotos: [F("manifesto/after-amigas.webp"), F("real-after-2-800.webp")], comodidades: ["piscina", "som", "cozinha"], modo: "aprovacao", host: "mari", desc: "Piscina aquecida e set de house até meio-dia." }),
    it({ id: "00000000-0000-4000-8000-000000000003", festa: "Warung Day Festival", bairro: "Batel", hora: "Depois de 12/12 · 05h00", vagas: 6, ocupadas: 6, modo: "aprovacao", host: "johnb" }),
    it({ id: "00000000-0000-4000-8000-000000000004", nome: "Cobertura Juvevê", bairro: "Juvevê", fotos: [F("manifesto/after-irmaos.webp")], status: "analise", host: "pedro", endereco: "Rua Fictícia, 10", comodidades: ["som", "ar"], preco_cents: 2500 }),
  ] };
  let pay = 0;
  const B = {
    auth: { getSession: async () => ({ data: { session: { user: { user_metadata: { nick: "gab" } } } } }), mfa: { getAuthenticatorAssuranceLevel: async () => ({ data: {} }) }, onAuthStateChange() {} },
    rpc: async () => ({ nick: "gab" }), content: async () => ({ me_owner: true }),
    ticketPayment: async (route, p) => {
      const a = st.items.find(x => x.id === p.after_id);
      if (route === "after-status") { if (pay >= 2) { a.my = "confirmado"; a.endereco = "Rua XV de Novembro, 1200, ap 1801"; a.my_hold = null; return { status: "paid" }; } if (pay) { pay++; return { status: "pending", qr_code: "00020126580014br.gov.bcb.pix-DEMO" }; } return { status: null }; }
      pay = 1; return { status: "pending", qr_code: "00020126580014br.gov.bcb.pix-DEMO-copia-e-cola" };
    },
    after: async (action, p) => {
      await new Promise(r => setTimeout(r, 250));
      if (action === "list") return JSON.parse(JSON.stringify(st));
      if (action === "create") { const id = "00000000-0000-4000-8000-0000000000" + (10 + st.items.length); st.items.unshift(it({ id, ...p, vagas: +p.vagas, preco_cents: +p.preco_cents, status: "analise", host: "gab", endereco: p.endereco })); return { id, status: "analise" }; }
      const a = st.items.find(x => x.id === p.id);
      if (action === "edit") { Object.assign(a, p, { vagas: +p.vagas, preco_cents: +p.preco_cents }); if (a.status === "recusado") a.status = "analise"; return { ok: true }; }
      if (action === "approve") a.status = "aberto";
      if (action === "reject") { a.status = "recusado"; a.motivo = p.motivo; }
      if (action === "join") { const s = a.preco_cents > 0 ? "pagamento" : a.modo === "livre" ? "confirmado" : "pendente"; a.my = s; a.ocupadas++; if (s === "pagamento") a.my_hold = new Date(Date.now() + 35 * 60000).toISOString(); if (s === "confirmado") a.endereco = "Rua XV de Novembro, 1200, ap 1801"; return { status: s }; }
      if (action === "leave") { a.my = null; a.ocupadas--; a.endereco = null; }
      if (action === "end") a.status = "encerrado";
      if (action === "remove") st.items.splice(st.items.indexOf(a), 1);
      return { ok: true };
    },
  };
  Object.defineProperty(window, "BRB", { get: () => B, set: () => {} });
  addEventListener("DOMContentLoaded", () => { const b = document.createElement("div"); b.textContent = "Modo demonstração: nada aqui vai para o site de verdade"; b.style.cssText = "position:fixed;top:0;left:50%;transform:translateX(-50%);z-index:200;background:#0BFB12;color:#041a05;font:700 12px 'Inter Tight',sans-serif;padding:6px 14px;border-radius:0 0 10px 10px"; document.body.appendChild(b); });
})();
