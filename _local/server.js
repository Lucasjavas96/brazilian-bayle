// Ver o site no computador: node _local/server.js  →  http://localhost:5173
// Monta o site (dist/) ao iniciar e de novo sempre que um arquivo muda.
const http = require("http"), fs = require("fs"), path = require("path"), { execFileSync } = require("child_process");
const ROOT = path.join(__dirname, ".."), DIST = path.join(ROOT, "dist");
const build = () => { try { execFileSync(process.execPath, [path.join(__dirname, "build.js")], { stdio: "inherit" }) } catch (e) { console.error("erro no build") } };
build();
let t; for (const d of ["src", "assets"]) fs.watch(path.join(ROOT, d), { recursive: true }, () => { clearTimeout(t); t = setTimeout(build, 200) });
for (const f of ["styles.css", "app.js"]) fs.watch(path.join(ROOT, f), () => { clearTimeout(t); t = setTimeout(build, 200) });
const T = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml", ".mp4": "video/mp4", ".xml": "application/xml", ".txt": "text/plain" };
http.createServer((q, r) => {
  let p = decodeURIComponent(q.url.split("?")[0]);
  // editor dos botões do Hero: só local, aberto com ?editar
  if (p === "/__editor.js") { r.writeHead(200, { "Content-Type": T[".js"], "Cache-Control": "no-store" }); return r.end(fs.readFileSync(path.join(__dirname, "editor-botoes.js"))); }
  if (p === "/__salvar" && q.method === "POST") { let b = ""; q.on("data", c => b += c); q.on("end", () => { fs.writeFileSync(path.join(__dirname, "botoes-hero.json"), b); r.writeHead(200); r.end("ok"); }); return; }
  if (p === "/podio-opcoes") { r.writeHead(200, { "Content-Type": T[".html"], "Cache-Control": "no-store" }); return r.end(fs.readFileSync(path.join(__dirname, "podio-opcoes.html"))); }
  if (p.endsWith("/")) p += "index.html";
  let f = path.join(DIST, p);
  if (!path.extname(f) && fs.existsSync(f + ".html")) f += ".html";
  fs.readFile(f, (e, d) => {
    if (e) { r.writeHead(404, { "Content-Type": T[".html"] }); return r.end(fs.existsSync(path.join(DIST, "404.html")) ? fs.readFileSync(path.join(DIST, "404.html")) : "404") }
    if (path.basename(f) === "index.html" && /(^|[?&])editar/.test(q.url.split("?")[1] || "")) d = Buffer.from(String(d).replace("</body>", '<script src="/__editor.js"></script></body>'));
    r.writeHead(200, { "Content-Type": T[path.extname(f)] || "application/octet-stream", "Cache-Control": "no-store" }); r.end(d);
  });
}).listen(process.env.PORT || 5173, () => console.log("http://localhost:" + (process.env.PORT || 5173)));
