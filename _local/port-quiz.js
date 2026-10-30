/* Separa o Bailinho (arquivo único) em páginas e arquivos externos para o site (CSP: sem script inline).
   Uso: node _local/port-quiz.js  → escreve em site/quiz-src/ (index.html, quiz.css, quiz.js, trilha1.json) */
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "..", "bailinho", "prototipo", "bailinho_trilha1.html");
const OUT = path.join(ROOT, "quiz-src");
const h = fs.readFileSync(SRC, "utf8");

const cssA = h.indexOf(">", h.indexOf("<style")) + 1, cssB = h.indexOf("</style>");
let css = h.slice(cssA, cssB).replace(/url\(assets\/fonts\//g, "url(/assets/quiz/fonts/").replace(/url\("assets\/fonts\//g, 'url("/assets/quiz/fonts/');
const dataM = h.match(/<script type="application\/json" id="data">([\s\S]*?)<\/script>/);
const data = dataM[1].replace(/\\u003c/g, "<");
JSON.parse(data);
const jsM = h.match(/<\/script>\s*<script>([\s\S]*?)<\/script>/);
let js = jsM[1].replace("JSON.parse(document.getElementById('data').textContent)", "window.__BAILINHO_DATA__");
if (js.includes("document.getElementById('data')")) throw new Error("referência a #data sobrou");
js = js.replace(/assets\/papagaio\.webp/g, "/assets/quiz/papagaio.webp").replace(/assets\/logo\.webp/g, "/assets/quiz/logo.webp");
fs.mkdirSync(OUT, { recursive: true });

// markup do corpo (entre </style> e o primeiro <script>)
const bodyHtml = h.slice(cssB + "</style>".length, h.indexOf("<script", cssB)).replace(/assets\/papagaio\.webp/g, "/assets/quiz/papagaio.webp").replace(/assets\/logo\.webp/g, "/assets/quiz/logo.webp");

// o JS carrega os dados por fetch antes de rodar
const boot = `/* Bailinho · Trilha 1. Carrega /quiz/trilha1.json e inicia o jogo. */
fetch("/quiz/trilha1.json").then(r => r.json()).then(d => { window.__BAILINHO_DATA__ = d; start(); }).catch(() => {
  document.body.insertAdjacentHTML("beforeend", '<p style="padding:24px;font-family:sans-serif">Não deu para carregar o quiz agora. Tente de novo em instantes.</p>');
});
function start() {
${js}
}
`;
const page = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Bailinho · Quiz da Brazilian Bayle</title>
<meta name="description" content="Bailinho: o quiz de música eletrônica da Brazilian Bayle. Trilha 1, entre na pista e mostre que é bayle fino.">
<link rel="icon" href="/assets/favicon-32.png">
<link rel="stylesheet" href="/quiz/quiz.css">
</head>
<body>
${bodyHtml}
<script src="/quiz/quiz.js"></script>
</body>
</html>
`;
fs.writeFileSync(path.join(OUT, "index.html"), page);
fs.writeFileSync(path.join(OUT, "quiz.css"), css);
fs.writeFileSync(path.join(OUT, "quiz.js"), boot);
fs.writeFileSync(path.join(OUT, "trilha1.json"), data);
console.log("ok", { css: css.length, js: boot.length, data: data.length, body: bodyHtml.length });
