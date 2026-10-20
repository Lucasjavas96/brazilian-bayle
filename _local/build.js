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
  ["ranking", "/ranking", "Ranking"],
  ["votar", "/ranking#votar", "Avaliar DJs"],
  ["clube", "/clube", "BRB Clubbers"],
  ["criticos", "/criticos", "Críticos"],
  ["galeria", "/#galera", "Galeria"],
  ["loja", "/loja", "Loja"],
];

const esc = s => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

const ORG = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Brazilian Bayle",
  url: SITE,
  logo: `${SITE}/assets/icon-512.png`,
  email: EMAIL,
  sameAs: [IG],
  areaServed: "BR",
  description: "Campeonato brasileiro de DJs com votação da comunidade e o network BRB Clubbers.",
};

function layout(meta, body) {
  const url = SITE + (meta.path === "/" ? "/" : meta.path);
  const title = meta.path === "/" ? meta.title : `${meta.title} · Brazilian Bayle`;
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
<meta property="og:site_name" content="Brazilian Bayle">
<meta property="og:locale" content="pt_BR">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(meta.description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE}/assets/og.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Brazilian Bayle: o campeonato brasileiro de DJs">
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
  <a href="/" class="mbar-logo" aria-label="Brazilian Bayle, início"><img src="/assets/logo-original-transparente.png" alt="" width="78" height="52"></a>
  <p class="mbar-tag">A pista é <em>nossa.</em></p>
</div>

<!-- menu lateral fixo -->
<header class="side" id="side">
  <a href="/" class="side-logo" aria-label="Brazilian Bayle, início"><img src="/assets/logo.webp" alt="Brazilian Bayle" width="180" height="120"></a>
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
    <div class="foot-flag">
      <img src="/assets/bandeira-hd-1600.webp" srcset="/assets/bandeira-hd-800.webp 800w, /assets/bandeira-hd-1600.webp 1600w" sizes="(min-width:1024px) calc(100vw - 260px), 100vw" alt="Bandeira amarela com o logo BR Bayle e o papagaio" loading="lazy" width="1094" height="913">
    </div>
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
      <span>© ${YEAR} Brazilian Bayle · projeto independente, sem vínculo com os artistas e casas citados</span>
      <span>A pista é nossa.</span>
    </div>
  </footer>
</div>

<div class="toast" id="toast" role="status" aria-live="polite"></div>
<script src="/app.js" defer></script>
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

copyDir(path.join(ROOT, "assets"), path.join(OUT, "assets"));
const css = fs.readFileSync(path.join(ROOT, "assets/fonts/fonts.css"), "utf8") + fs.readFileSync(path.join(ROOT, "styles.css"), "utf8");
// CSS enxuto: fontes embutidas, sem comentários nem espaços sobrando
fs.writeFileSync(path.join(OUT, "styles.css"), css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s*\n\s*/g, "\n"));
fs.copyFileSync(path.join(ROOT, "app.js"), path.join(OUT, "app.js"));
fs.writeFileSync(path.join(OUT, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
fs.writeFileSync(path.join(OUT, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${SITE}${u}</loc></url>`).join("\n")}
</urlset>
`);
console.log(`ok: ${pages.length} páginas em dist/`);
