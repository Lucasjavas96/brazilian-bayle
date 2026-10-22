/* Monta o site em /dist a partir de src/pages.
   Cada página começa com um comentário <!--meta {...} --> e traz só o conteúdo do <main>.
   O layout (cabeçalho, menu lateral, rodapé, SEO) fica aqui, em um lugar só.
   Rodar: node _local/build.js */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "dist");
const SITE = "https://brazilian-bayle.vercel.app";
const EMAIL = "brazilianbaile@gmail.com";
const IG = "https://instagram.com/brazilianbayle";
const YEAR = 2026;

const NAV = [
  ["ranking", "/ranking", "Brasileirão dos DJs"],
  ["votar", "/ranking#votar", "Avaliar DJs"],
  ["djpedia", "/djpedia", "DJ Pédia"],
  ["curitiba", "/#curitiba", "Baile Curitibano"],
  ["spotted", "/spotted", "Spotted Bayle"],
  ["manifesto", "/manifesto", "Manifesto"],
  ["agenda", "/agenda", "Agenda"],
  ["clube", "/clube", "BRB Clubbers"],
  ["galeria", "/galeria", "Galeria"],
  ["loja", "/loja", "Loja"],
];

const esc = s => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

const ORG = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Brazilian Baile",
  url: SITE,
  logo: `${SITE}/assets/icon-512.png`,
  email: EMAIL,
  sameAs: [IG],
  areaServed: "BR",
  description: "Campeonato brasileiro de DJs com votação da comunidade e o network BRB Clubbers.",
};

function layout(meta, body) {
  const url = SITE + (meta.path === "/" ? "/" : meta.path);
  const title = meta.path === "/" ? meta.title : `${meta.title} · Brazilian Baile`;
  const jsonld = [ORG, ...(meta.jsonld || [])].map(j => `<script type="application/ld+json">${JSON.stringify(j)}</script>`).join("\n");
  const navLinks = NAV.map(([k, href, label], i) =>
    `<li><a href="${href}"${meta.nav === k ? ' aria-current="page"' : ""}><span class="mono">${String(i + 1).padStart(2, "0")}</span>${label}</a></li>`).join("\n        ");

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(meta.description)}">
<link rel="canonical" href="${url}">
${meta.noindex ? '<meta name="robots" content="noindex">' : ""}
<meta name="theme-color" content="#FFD400">
<link rel="icon" type="image/png" sizes="32x32" href="/assets/brand-icon-32.png">
<link rel="icon" type="image/png" sizes="192x192" href="/assets/brand-icon-192.png">
<link rel="apple-touch-icon" href="/assets/brand-icon-180.png">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Brazilian Baile">
<meta property="og:locale" content="pt_BR">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(meta.description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE}/assets/og.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Brazilian Baile: o campeonato brasileiro de DJs">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(meta.description)}">
<meta name="twitter:image" content="${SITE}/assets/og.jpg">
<link rel="preload" href="/assets/fonts/syne-700.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/intertight-400.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/styles.css">
${meta.preload || ""}
${jsonld}
</head>
<body class="page-${meta.nav || "x"}">
<a class="skip" href="#conteudo">Pular para o conteúdo</a>

<!-- barra do celular -->
<div class="mbar">
  <button class="burger" id="burger" aria-label="Abrir menu" aria-expanded="false" aria-controls="side"><i></i><i></i></button>
  <a href="/" class="mbar-logo" aria-label="Brazilian Baile, início"><img src="/assets/papagaio-refletivo-v2.png" alt="" width="42" height="56"></a>
  <p class="mbar-tag">A pista é <em>nossa.</em></p>
</div>

<!-- menu lateral fixo -->
<header class="side" id="side">
  <a href="/" class="side-logo" aria-label="Brazilian Baile, início"><img src="/assets/logo.webp" alt="Brazilian Baile" width="180" height="120"></a>
  <p class="side-tag"><span class="side-tag-1">A pista é <em>nossa.</em></span><span class="side-tag-2">O baile é e sempre será brasileiro.</span></p>
  <nav aria-label="Principal">
    <ul class="side-nav">
        ${navLinks}
    </ul>
  </nav>
  <a href="/clube#candidatura" class="btn btn-y side-cta">Faça parte</a>
  <div class="side-foot">
    <a href="${IG}" target="_blank" rel="noopener" class="mono">Instagram ↗</a>
    <span class="mono">Balneário Camboriú · Curitiba</span>
  </div>
</header>
<div class="scrim" id="scrim" hidden></div>

<div class="content">
  <div class="ticker" aria-hidden="true"><div class="ticker-track" id="ticker"></div></div>

  <main id="conteudo" tabindex="-1">
${body.trim()}
  </main>

  <footer class="foot">
    <div class="wrap foot-join">
      <h2 class="display foot-title">Faça parte de tudo <em>isso.</em></h2>
      <div class="foot-cta">
        <a href="/clube#candidatura" class="btn btn-y">Quero ser BRB Clubber</a>
        <a href="/ranking#votar" class="btn btn-ghost">Avaliar um DJ</a>
      </div>
    </div>
    <div class="wrap foot-cols">
      <div>
        <h3 class="mono">Navegue</h3>
        <ul>${NAV.map(([, h, l]) => `<li><a href="${h}">${l}</a></li>`).join("")}</ul>
      </div>
      <div>
        <h3 class="mono">Contato</h3>
        <ul>
          <li><a href="mailto:${EMAIL}">${EMAIL}</a></li>
          <li><a href="${IG}" target="_blank" rel="noopener">Instagram @brazilianbayle</a></li>
          <li>Balneário Camboriú (SC) · Curitiba (PR)</li>
        </ul>
      </div>
      <div>
        <h3 class="mono">Legal</h3>
        <ul>
          <li><a href="/termos">Termos de uso</a></li>
          <li><a href="/privacidade">Política de privacidade</a></li>
        </ul>
      </div>
    </div>
    <div class="wrap foot-bar mono">
      <span>© ${YEAR} Brazilian Baile · projeto independente, sem vínculo com os artistas e casas citados</span>
      <span>A pista é nossa.</span>
    </div>
  </footer>
</div>

<div class="toast" id="toast" role="status" aria-live="polite"></div>
<script src="/app.js" defer></script>
${meta.nav === "spotted" ? '<script src="/spotted.js" defer></script>' : ""}
</body>
</html>
`;
}

// imagens: srcset 800/1600 automático e fundos desfocados leves
function optimize(html) {
  html = html.replace(/<img([^>]*?) src="\/assets\/([\w-]+)-1600\.webp"(?![^>]*srcset)([^>]*)>/g, (m, a, name, z) =>
    fs.existsSync(path.join(ROOT, "assets", name + "-800.webp"))
      ? `<img${a} src="/assets/${name}-1600.webp" srcset="/assets/${name}-800.webp 800w, /assets/${name}-1600.webp 1600w" sizes="(min-width:1024px) calc(100vw - 260px), 100vw"${z}>`
      : m);
  // fundos desfocados: usa a miniatura de 48px já desfocada (≈350 bytes) em vez de desfocar no navegador
  html = html.replace(/(class="(?:sl-bg|mp-bg|drop-bg)"(?: aria-hidden="true")? style="background-image:url\(\/assets\/[\w-]+?)-(?:800|1600)\.webp\)"/g, '$1-blur.webp)"');
  return html;
}

function copyDir(src, dst, skip = () => false) {
  fs.mkdirSync(dst, { recursive: true });
  for (const f of fs.readdirSync(src)) {
    if (skip(f)) continue;
    const s = path.join(src, f), d = path.join(dst, f);
    const st = fs.statSync(s);
    if (st.isDirectory()) { copyDir(s, d, skip); continue }
    // só copia o que mudou (evita apagar e recriar tudo a cada build)
    if (fs.existsSync(d)) { const dt = fs.statSync(d); if (dt.size === st.size && dt.mtimeMs >= st.mtimeMs) continue }
    fs.copyFileSync(s, d);
  }
}

fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) if (f.endsWith(".html")) fs.rmSync(path.join(OUT, f), { force: true });

const pages = fs.readdirSync(path.join(ROOT, "src/pages")).filter(f => f.endsWith(".html"));
const urls = [];
for (const f of pages) {
  const raw = fs.readFileSync(path.join(ROOT, "src/pages", f), "utf8");
  const m = raw.match(/^<!--meta\s*([\s\S]*?)-->/);
  if (!m) throw new Error(`${f}: falta o comentário <!--meta {...} -->`);
  const meta = JSON.parse(m[1]);
  const html = optimize(layout(meta, raw.slice(m[0].length)));
  const name = f.replace(/\.html$/, "");
  const out = path.join(OUT, `${name}.html`); // /ranking → ranking.html (cleanUrls no vercel.json)
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
  if (!meta.noindex) urls.push(meta.path);
}

/* ---------- DJ Pédia: índice A–Z e um verbete por DJ (dados em src/data) ----------
   Todo DJ do ranking e do Baile Curitibano tem página. Sem verbete pronto, a página sai com a ficha
   e "não informado" nos campos, para nenhum link do ranking cair num beco. */
const slugify = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const ini = s => s.replace(/[^A-Za-zÀ-ÿ ]/g, "").split(/\s+/).filter(Boolean).map(w => w[0]).join("").slice(0, 2).toUpperCase();
const readJson = f => JSON.parse(fs.readFileSync(path.join(ROOT, "src/data", f), "utf8"));
const DJLIST = [...readJson("djs.json"), ...readJson("curitiba.json").map(d => ({ ...d, curitiba: true }))];
const PROFILES = Object.fromEntries(readJson("djpedia.json").map(p => [p.slug, p]));
const NI = "não informado";
const writePage = (rel, meta, body) => {
  const out = path.join(OUT, rel + ".html");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, optimize(layout(meta, body)));
  if (!meta.noindex) urls.push(meta.path);
};
const djPhoto = s => ["webp", "jpg"].map(x => `assets/djs/${s}.${x}`).find(f => fs.existsSync(path.join(ROOT, f)));
{
  fs.rmSync(path.join(OUT, "djpedia"), { recursive: true, force: true });
  const sorted = [...DJLIST].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }));
  const letterOf = n => n.normalize("NFD").replace(/[̀-ͯ]/g, "")[0].toUpperCase();
  const groups = {};
  sorted.forEach(d => (groups[letterOf(d.nome)] ||= []).push(d));
  const letters = Object.keys(groups);
  const done = sorted.filter(d => PROFILES[slugify(d.nome)]?.historia?.length).length;
  writePage("djpedia", {
    path: "/djpedia", nav: "djpedia", title: "DJ Pédia · Conheça os DJs",
    description: "A enciclopédia dos DJs do ranking da Brazilian Baile e da cena de Curitiba: origem, início de carreira, gêneros e trajetória de cada artista, em ordem alfabética.",
  }, `
<section class="sec dark page-head wiki" aria-labelledby="t-wiki">
  <div class="wrap">
    <p class="mono y">DJ Pédia · ${sorted.length} DJs · ${done} verbetes completos</p>
    <h1 class="display" id="t-wiki">Conheça os <em>DJs</em></h1>
    <p class="lead dim">A enciclopédia da pista brasileira. De onde cada DJ veio, como começou, o que toca e a trajetória até aqui. Toque no nome para abrir o verbete.</p>
    <nav class="az" aria-label="Letras">${letters.map(l => `<a href="#letra-${l}">${l}</a>`).join("")}</nav>
    <div class="wiki-list">
      ${letters.map(l => `<section class="wiki-letter" id="letra-${l}" aria-labelledby="h-${l}">
        <h2 class="wiki-l" id="h-${l}">${l}</h2>
        <ul>${groups[l].map(d => { const s = slugify(d.nome), p = PROFILES[s], full = p?.historia?.length;
          return `<li id="${s}"><a class="wiki-item${full ? "" : " is-soon"}" href="/djpedia/${s}">
            <span class="ge-badge" aria-hidden="true">${ini(d.nome)}</span>
            <span class="wiki-name">${esc(d.nome)}</span>
            <span class="wiki-meta">${d.curitiba ? "Baile Curitibano" : (p?.origem && p.origem !== NI ? p.origem + " · " : "") + d.estilo}</span>
            <span class="wiki-status mono">${full ? "Ler verbete →" : "Ficha em construção →"}</span>
          </a></li>` }).join("")}</ul>
      </section>`).join("")}
    </div>
    <p class="example-note mono">Os verbetes são escritos a partir de fontes públicas, listadas no fim de cada página.</p>
  </div>
</section>`);

  const list = arr => (arr || []).filter(Boolean);
  for (const d of sorted) {
    const s = slugify(d.nome), p = { nome: d.nome, estilos: d.estilo ? [d.estilo] : [], ...PROFILES[s] };
    const v = x => (x && String(x).trim()) || NI;
    const box = [["Nome artístico", p.nome], ["Nome real", v(p.nome_civil)], ["Local de nascimento", v(p.nascimento)], ["DJ desde", v(p.ativo_desde)],
      ["Principais gêneros", v(list(p.estilos).join(", "))], ...(list(p.gravadoras).length ? [["Selos", p.gravadoras.join(", ")]] : [])];
    const img = djPhoto(s), foto = p.foto;
    const sec = (id, title, html) => html ? `<section class="wiki-sec" aria-labelledby="${id}"><h2 id="${id}">${title}</h2>${html}</section>` : "";
    const ul = arr => list(arr).length ? `<ul>${list(arr).map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : "";
    const full = list(p.historia).length > 0;
    const hist = full ? p.historia.map(x => `<p>${esc(x)}</p>`).join("")
      : `<p>Ainda não reunimos fontes confiáveis sobre a trajetória de ${esc(p.nome)}. Este verbete está em construção, e os campos sem informação aparecem como "não informado".</p>`;
    const kind = d.curitiba ? "Baile Curitibano" : `Brasileirão dos DJs · ${esc(d.estilo)}`;
    const credit = img && foto ? `${esc(foto.credito)} · ${foto.pagina ? `<a href="${esc(foto.pagina)}" target="_blank" rel="noopener">${esc(foto.licenca)}</a>` : esc(foto.licenca)}` : "";
    writePage(`djpedia/${s}`, {
      path: `/djpedia/${s}`, nav: "djpedia", title: `${p.nome} · DJ Pédia`,
      description: (p.resumo || `${p.nome}, DJ ${d.curitiba ? "da cena de Curitiba" : "brasileiro"} na DJ Pédia da Brazilian Baile.`).slice(0, 158),
      noindex: !full,
      jsonld: [{ "@context": "https://schema.org", "@type": "Person", name: p.nome, alternateName: p.nome_civil && p.nome_civil !== NI ? p.nome_civil : undefined, jobTitle: "DJ", genre: list(p.estilos), image: img ? `${SITE}/${img}` : undefined, sameAs: list((p.fontes || []).map(f => f.url)).slice(0, 3) }],
    }, `
<article class="sec paper page-head wiki-article" aria-labelledby="t-dj">
  <div class="wrap">
    <nav class="crumbs mono" aria-label="Você está em"><a href="/djpedia">DJ Pédia</a> <span aria-hidden="true">›</span> ${esc(p.nome)}</nav>
    <div class="wiki-grid">
      <aside class="wiki-box" aria-label="Ficha de ${esc(p.nome)}">
        <figure class="wiki-photo">${img
          ? `<img src="/${img}" alt="${esc(p.nome)}" width="600" height="600" decoding="async">`
          : `<div class="wiki-ph" role="img" aria-label="Foto de ${esc(p.nome)} em breve"><span>${ini(p.nome)}</span><small class="mono">Foto em breve</small></div>`}
          ${credit ? `<figcaption class="mono">Foto: ${credit}</figcaption>` : ""}
        </figure>
        <p class="wiki-box-name">${esc(p.nome)}</p>
        <dl>${box.map(([k, val]) => `<div><dt>${k}</dt><dd${val === NI ? ' class="ni"' : ""}>${esc(val)}</dd></div>`).join("")}</dl>
        ${d.curitiba ? "" : `<a class="btn btn-k" href="/ranking#votar">Avaliar ${esc(p.nome)}</a><a class="link-arrow mono" href="/ranking#tabela">Ver no ranking →</a>`}
      </aside>
      <div class="wiki-main">
        <p class="mono g">${kind}</p>
        <h1 class="display" id="t-dj">${esc(p.nome)}</h1>
        ${p.resumo ? `<p class="lead">${esc(p.resumo)}</p>` : ""}
        ${sec("h-hist", "Trajetória como DJ", hist)}
        ${sec("h-faixas", "Faixas marcantes", ul(p.faixas_marcantes))}
        ${sec("h-marcos", "Marcos da carreira", ul(p.marcos))}
        ${sec("h-infl", "Influências musicais", ul(p.referencias_musicais))}
        ${sec("h-fontes", "Referências", list(p.fontes).length ? `<ol class="wiki-src">${p.fontes.map(f => `<li><a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.titulo)}</a></li>`).join("")}</ol>` : `<p>Nenhuma fonte publicada ainda.</p>`)}
        ${credit ? `<p class="example-note mono">Crédito da imagem: ${credit}</p>` : ""}
        <p class="example-note mono">Última revisão: outubro de 2026</p>
      </div>
    </div>
  </div>
</article>`);
  }
}

copyDir(path.join(ROOT, "assets"), path.join(OUT, "assets"));
const css = fs.readFileSync(path.join(ROOT, "assets/fonts/fonts.css"), "utf8") + fs.readFileSync(path.join(ROOT, "styles.css"), "utf8");
// CSS enxuto: fontes embutidas, sem comentários nem espaços sobrando
fs.writeFileSync(path.join(OUT, "styles.css"), css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s*\n\s*/g, "\n"));
for (const js of ["app.js", "spotted.js"]) fs.copyFileSync(path.join(ROOT, js), path.join(OUT, js));
fs.writeFileSync(path.join(OUT, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
fs.writeFileSync(path.join(OUT, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${SITE}${u}</loc></url>`).join("\n")}
</urlset>
`);
console.log(`ok: ${pages.length} páginas em dist/`);
