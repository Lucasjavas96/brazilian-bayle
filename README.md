# Brazilian Bayle — site

O campeonato brasileiro de DJs e o network BRB Clubbers.

- No ar: https://brazilian-bayle.vercel.app
- Instagram: [@brazilianbayle](https://instagram.com/brazilianbayle)

## Estrutura

O site é estático (HTML, CSS e JavaScript, sem framework). Um script monta as páginas a partir de um layout único.

| Caminho | O que tem |
|---|---|
| `src/pages/*.html` | O conteúdo de cada página. Cada arquivo começa com `<!--meta {...} -->` (título, descrição, endereço) |
| `_local/build.js` | Monta o site em `dist/`: menu lateral, rodapé, SEO (Open Graph, JSON-LD), sitemap e robots |
| `styles.css` | Visual. Papéis fixos de fonte: Syne (títulos), Inter Tight (texto), JetBrains Mono (rótulos), serifa itálica (uma palavra por título, com `<em>`) |
| `app.js` | Interações: ranking 3D, pódio, votação, formulários, carrosséis |
| `assets/` | Fotos (`-800.webp` e `-1600.webp` são as versões leves), vídeo, ícones, `og.jpg` (prévia no WhatsApp) e `fonts/` |
| `_local/server.js` | Servidor para ver no computador. Remonta sozinho quando um arquivo muda |
| `vercel.json` | A Vercel roda `node _local/build.js` e publica `dist/` |

Páginas: `/` (início), `/ranking`, `/clube`, `/criticos`, `/loja`, `/termos`, `/privacidade` e a página de erro 404.

**Pré-temporada:** notas, votos, festas e resenhas são de demonstração e aparecem rotulados assim. Votos, candidaturas e lista de espera ficam só no navegador de quem preenche (localStorage). O próximo passo técnico é ligar esses formulários a um banco de dados.

## Para editar com o Claude Code

1. Pegue a versão mais nova: `git pull`
2. Rode o site no computador: `node _local/server.js` e abra http://localhost:5173
3. Peça a mudança em português. Textos de uma página ficam em `src/pages/`; o menu e o rodapé ficam em `_local/build.js`.
4. Confira no navegador (celular e computador) e peça: "faz o commit e o push".

Cada push na branch `main` atualiza o site na Vercel em cerca de 1 minuto.

## Regras que mantêm o site profissional

- Nada de texto "em definição" ou dado de exemplo sem rótulo visível.
- Toda imagem com `alt` (descrição da foto; `alt=""` só se for decoração).
- Fotos aparecem inteiras, sem corte. Sem figurinhas no site.
- Títulos não podem vazar no celular: teste em 360, 375 e 414 px.
- Antes de começar, `git pull`. Avise no grupo qual seção você está mexendo.

## Identidade

Amarelo Brasil `#FFD400`, verde `#009C3B`, azul `#002776`, grafite `#121212`, dourado BRB `#C9A45C`.
