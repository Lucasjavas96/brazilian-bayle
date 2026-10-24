/* Bayle All Stars Album: monta os dados do álbum no build.
   Países em ordem alfabética, cada um com a sua página (bandeira estilo Copa); quem tem 1 ou 2 DJs vai para
   "Resto do Mundo", no fim. DJ com dois países entra no primeiro. Dentro do país: DJ Mag Top 100 2026 primeiro,
   na ordem do ranking, depois os demais em ordem alfabética. As notas das cartas saem da régua (regua.js). */
const fs = require("fs");
const path = require("path");

// nome no álbum → [sigla da figurinha, arquivo da bandeira em /assets/flags]
const COUNTRIES = {
  "Brasil": ["BRA", "br"], "Inglaterra": ["ING", "gb-eng"], "Alemanha": ["ALE", "de"], "Holanda": ["HOL", "nl"], "EUA": ["EUA", "us"],
  "França": ["FRA", "fr"], "Itália": ["ITA", "it"], "Canadá": ["CAN", "ca"], "Bélgica": ["BEL", "be"], "Austrália": ["AUS", "au"],
  "África do Sul": ["AFS", "za"], "Suécia": ["SUE", "se"], "Espanha": ["ESP", "es"], "Ucrânia": ["UCR", "ua"], "Suíça": ["SUI", "ch"],
  "Escócia": ["ESC", "gb-sct"], "Noruega": ["NOR", "no"], "País de Gales": ["GAL", "gb-wls"], "Argentina": ["ARG", "ar"],
  "Coreia do Sul": ["COR", "kr"], "Bósnia": ["BOS", "ba"], "Turquia": ["TUR", "tr"], "Dinamarca": ["DIN", "dk"], "Israel": ["ISR", "il"],
  "Portugal": ["POR", "pt"], "Japão": ["JAP", "jp"], "Rússia": ["RUS", "ru"], "Chile": ["CHI", "cl"], "Grécia": ["GRE", "gr"],
  "Líbano": ["LIB", "lb"], "Irã": ["IRA", "ir"], "Haiti": ["HAI", "ht"], "Irlanda do Norte": ["IRN", "gb-nir"], "Irlanda": ["IRL", "ie"],
  "Polônia": ["POL", "pl"], "Finlândia": ["FIN", "fi"],
};
const MIN_PAGE = 3; // abaixo disso, o país vai para o Resto do Mundo

const slugify = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const tier = o => o >= 90 ? ["lendaria", "Lendária"] : o >= 85 ? ["epica", "Épica"] : o >= 80 ? ["rara", "Rara"] : ["comum", "Comum"];

module.exports = function albumData(ROOT) {
  const djs = JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/album-djs.json"), "utf8")).djs;
  const cartas = JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/album-cartas.json"), "utf8")).cartas;
  const { nota } = require("./regua.js");
  const byName = Object.fromEntries(cartas.map(c => [c.nome, c]));

  const groups = {};
  for (const [, pos, nome, paisRaw, genero] of djs) {
    const pais = paisRaw.split("/")[0].trim();
    if (!COUNTRIES[pais]) throw new Error(`album: país sem sigla/bandeira: ${pais} (${nome})`);
    (groups[pais] ||= []).push({ nome, pos, pais, genero });
  }
  const order = (a, b) => (a.pos || 999) - (b.pos || 999) || a.nome.localeCompare(b.nome, "pt-BR");
  const pages = [], rest = [];
  Object.keys(groups).sort((a, b) => a.localeCompare(b, "pt-BR")).forEach(pais => {
    if (groups[pais].length >= MIN_PAGE) pages.push({ nome: pais, sigla: COUNTRIES[pais][0], flag: COUNTRIES[pais][1], djs: groups[pais].sort(order) });
    else rest.push(...groups[pais]);
  });
  if (rest.length) pages.push({ nome: "Resto do Mundo", sigla: "RDM", flag: "", djs: rest.sort(order) });

  const cards = {};
  pages.forEach(p => p.djs.forEach((d, i) => {
    d.num = `${p.sigla} ${String(i + 1).padStart(2, "0")}`;
    d.flag = COUNTRIES[d.pais][1];
    const c = byName[d.nome]; if (!c) return;
    const n = nota(c.sinais), ovr = n.OVR; delete n.OVR;
    const [cls, rar] = tier(ovr);
    d.id = c.slug;
    cards[c.slug] = { slug: c.slug, nome: c.nome, num: d.num, flag: c.pais, paisNome: c.paisNome, genero: c.genero, tag: c.tag, bpm: c.bpm,
      rank: c.rank, foto: c.foto, pos: c.pos, zoom: c.zoom || "", origin: c.origin || "", texto: c.texto, faixa: c.faixa, ovr, attrs: n, cls, rar };
  }));
  const missing = cartas.filter(c => !cards[c.slug]).map(c => c.nome);
  if (missing.length) throw new Error("album: carta sem DJ na lista: " + missing.join(", "));
  return { total: djs.length, pages: pages.map(p => ({ ...p, djs: p.djs.map(({ nome, num, flag, id, genero }) => ({ nome, num, flag, id, genero })) })), cards };
};
