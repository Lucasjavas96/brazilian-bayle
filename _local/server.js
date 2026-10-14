// servidor local simples para ver o site no navegador: node server.js
const http=require("http"),fs=require("fs"),path=require("path");
const T={".html":"text/html; charset=utf-8",".css":"text/css",".js":"text/javascript",".png":"image/png",".jpg":"image/jpeg",".webp":"image/webp",".svg":"image/svg+xml",".mp4":"video/mp4"};
http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split("?")[0]);if(p.endsWith("/"))p+="index.html";
 const f=path.join(__dirname,"..",p);fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);return r.end("404")}r.writeHead(200,{"Content-Type":T[path.extname(f)]||"application/octet-stream"});r.end(d)})}).listen(process.env.PORT||5173);
