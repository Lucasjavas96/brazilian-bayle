# Brazilian Bayle — site

O campeonato brasileiro de DJs e o network BRB Clubbers.

- No ar: https://brazilian-bayle.vercel.app
- Instagram: [@brazilianbayle](https://instagram.com/brazilianbayle)

## Como o site é feito

É um site estático, sem framework:

| Arquivo | O que tem |
|---|---|
| `index.html` | A estrutura e os textos de todas as seções |
| `styles.css` | Cores, fontes e layout (as regras mais novas ficam no fim do arquivo) |
| `app.js` | A parte interativa: ranking, votação, carrosséis, loja, contagem regressiva |
| `assets/` | Fotos, vídeo e logo |
| `_local/server.js` | Servidor só para ver o site no computador. Não vai para a Vercel |
| `vercel.json` | Diz para a Vercel que o site é estático |

Votos, candidaturas e sacola ainda são **de demonstração**: ficam salvos só no navegador de quem testa.

## Para editar com o Claude Code

1. Baixe o repositório: `git clone <link do repositório>`
2. Abra a pasta no Claude Code e peça a mudança em português.
3. Para ver no computador: `node _local/server.js` e abra http://localhost:5173
4. Quando estiver bom, peça ao Claude: "faz o commit e o push".

Cada push na branch `main` atualiza o site na Vercel sozinho em cerca de 1 minuto.

## Combinados do time

- **Antes de começar, pegue a versão mais nova:** `git pull`. Evita conflito com o que os outros mudaram.
- **Mudança pequena, envio logo.** Melhor vários envios pequenos do que um gigante.
- **Avise no grupo o que está mexendo**, para duas pessoas não editarem a mesma seção ao mesmo tempo.

## Identidade

- Amarelo Brasil `#FFD400`, verde `#009C3B`, azul `#002776`, preto `#0A0B0A`, dourado BRB `#C9A45C`
- Fontes: Syne (títulos), Cormorant Garamond itálico (destaques), Inter Tight (texto), JetBrains Mono (rótulos)
- Fotos aparecem inteiras, sem corte. Sem figurinhas no site.
