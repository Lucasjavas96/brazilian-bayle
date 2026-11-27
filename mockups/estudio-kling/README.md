# Fotos de estúdio — Brazilian Bayle

## Série v2 — 26/11/2026

Gerada com **OpenAI image_gen**, conforme autorização para substituir o Kling. São **19 fotos novas (08–26)** em `geradas/v2/`, incluindo a21 refeita como cropped e08/23 refeitas com o papagaio v2. Fotos anteriores e referências foram preservadas.

- [Abrir galeria](galeria-v2.html) · [Prancha completa](prancha-estudio-v2.jpg).
- Prompts finais, arquivos de origem e dimensões em `manifesto-geracao-v2.json`.
- Dimensões efetivamente entregues: **1086 ×1448px**, proporção3:4. O gerador nativo não entregou os2K solicitados; os arquivos não foram ampliados artificialmente.
- Croppeds11–13 e17–22 seguem a categoria do PR20 e usam a modelo feminina. Isso corrige as divergências da tabela original (12,13,19,22).
- Artes com o papagaio atualizado para esta série:06,08,23 e24 em `estampas-v2/`. Os PNGs originais de impressão continuam preservados; as versões geradas devem ser conferidas na preparação de impressão.
- As referências de pose abaixo são orientações. Algumas variações de cor reaproveitam a pose aprovada para preservar a identidade e o desenho da estampa.
- O PR20 já contém a atualização dos ícones principais do site. Este pacote **não publica o site** e não substitui as fotos atuais da loja.

## Receita original do Kling (referência histórica)

Fotos de produto com **2 modelos fixos** (um homem e uma mulher) em estúdio, de costas, com a camisa em movimento. Pedido do Gab em 26/11/2026 para as estampas novas 08 a 26 de `estampas-costas/`.

## Como gerar

1. No Kling (kling.ai), use **Imagem a partir de referências** com o modelo **Kling Image 4.0** (`kling-image-v4_0`), proporção **3:4**, resolução **2K**, 1 imagem. Custa 4 créditos por foto.
2. **Imagem 1** = a estampa (PNG em `estampas-costas/<pasta>/`). Se o fundo transparente der problema, coloque a estampa sobre um fundo da cor da camisa antes de subir.
3. **Imagem 2** = a foto do modelo: `modelos-referencia/modelo-homem.jpg` ou `modelos-referencia/modelo-mulher.jpg`. É isso que mantém o mesmo rosto, cabelo, calça e estúdio em todas.
4. Monte o prompt com o molde abaixo, trocando os 4 campos entre colchetes pelos da tabela. No texto, `图片1` é a Imagem 1 e `图片2` é a Imagem 2.
5. Salve o resultado em `geradas/` com o nome da estampa.

> **Atenção: pastas mudando (PR #20).** O PR de categorias move `estampas-costas/` e `mockups/` para `produtos/<categoria>/<tipo>/<estampa>/estampa-costas/`. Depois que ele entrar, pegue a estampa nessa pasta nova (ela já diz se é oversized ou cropped) e mova esta pasta `estudio-kling/` para junto dele. As estampas de **cropped** (17–19 Sorry I only date DJs, 20–22 Girls just wanna have techno) devem ser feitas na mulher com **cropped**, não oversized: troque [CAMISA] por `a [cor] fitted cropped cotton t-shirt ending above the navel`.

Regra de cor: estampa branca em camisa **preta**; estampa preta e as verdes em camisa **off-white** (exceto a 08, verde neon, na preta).

## Molde do prompt

```
Real fashion e-commerce studio photograph, same studio, seamless warm light-grey paper backdrop, lighting and camera as 图片2, no lighting equipment in frame. The model is [MODELO]. Back to the camera, [POSE]: [CAMISA] is in real motion, hem and sleeves flaring and swinging, realistic fabric ripples, slight motion blur only at the hem. On the back of the shirt EXACTLY the print from 图片1 ([TINTA]), large and centered on the upper back, every letter and drawing identical, real print texture following the fabric. Full body head to shoes, vertical. Real skin texture, true-to-life colors, crisp focus on the print. No other text, no watermark.
```

- [MODELO] homem: `exactly the same man as in 图片2 (same face, curly hair, skin tone, body, same light-blue jeans and white sneakers)`
- [MODELO] mulher: `exactly the same woman as in 图片2 (same long dark wavy hair, skin tone, body, same black baggy jeans and black sneakers)`
- [CAMISA] preta: `the black heavyweight oversized boxy cotton t-shirt`
- [CAMISA] off-white: `an OFF-WHITE cream heavyweight oversized boxy cotton t-shirt`

## As 19 estampas

| Estampa | Modelo | Camisa | [POSE] | [TINTA] | Status |
|---|---|---|---|---|---|
| 08-posso-dancar-so-mais-essa | homem | preta | mid-stride walking away with one arm swinging forward | bright green ink with small yellow signature | gerada e revisada v2 |
| 09-vintage-clube-john | homem | preta | twisting his torso in a quick turn | full color photo print with metallic lettering | gerada e revisada v2 |
| 10-the-last-romantic | mulher | off-white | mid-spin with hair flying | dark bottle-green ink with small yellow signature | gerada e revisada v2 |
| 11-afterparty-princess-verde | mulher | off-white · cropped | caught in a small jump in the air | green ink circular badge with yellow script | gerada e revisada v2 |
| 12-afterparty-princess-branco | mulher | preta · cropped | walking away with a bounce | white ink circular badge with yellow script | gerada e revisada v2 |
| 13-afterparty-princess-preto | mulher | off-white · cropped | turning away mid-step | black ink circular badge with yellow script | gerada e revisada v2 |
| 14-sorry-im-nonverbal-right-now | mulher | off-white | dancing with arms up | dark green ink with yellow signature | gerada e revisada v2 |
| 15-sorry-im-nonverbal-right-now-branco | homem | preta | dancing, shoulders moving | white ink with yellow signature | gerada e revisada v2 |
| 16-sorry-im-nonverbal-right-now-preto | mulher | off-white | spinning with hair flying | black ink with yellow signature | gerada e revisada v2 |
| 17-sorry-i-only-date-djs-verde | mulher | off-white · cropped | walking away with a hip sway | green and cream ink | gerada e revisada v2 |
| 18-sorry-i-only-date-djs-branco | mulher | preta · cropped | mid-spin with hair flying | white ink | gerada e revisada v2 |
| 19-sorry-i-only-date-djs-preto | mulher | off-white · cropped | walking away mid-stride | black ink | gerada e revisada v2 |
| 20-girls-just-wanna-have-techno-verde | mulher | off-white · cropped | dancing with one arm up | green ink | gerada e revisada v2 |
| 21-girls-just-wanna-have-techno-branco | mulher | preta · cropped | mid-spin, hair flying, arms slightly out | white ink | gerada e revisada v2 |
| 22-girls-just-wanna-have-techno-preto | mulher | off-white · cropped | turning away with a quick twist | black ink | gerada e revisada v2 |
| 23-posso-dancar-so-mais-essa-branco | homem | preta | walking away and turning, one arm swinging | white ink with the small yellow Brazilian Bayle signature | gerada e revisada v2 |
| 24-posso-dancar-so-mais-essa-preto | mulher | off-white | caught in a small jump in the air | black ink with yellow signature | gerada e revisada v2 |
| 25-the-last-romantic-branco | homem | preta | mid-stride walking away | white ink with yellow signature | gerada e revisada v2 |
| 26-the-last-romantic-preto | mulher | off-white | turning away mid-step, hair moving | black ink with yellow signature | gerada e revisada v2 |

## Prompts usados para criar os 2 modelos

Usados uma vez só, com a estampa como Imagem 1 (sem Imagem 2). Os resultados viraram as fotos de `modelos-referencia/`.

**Homem** (estampa 23):

```
Real fashion e-commerce studio photograph, shot on a Canon EOS R5 with an 85mm lens, seamless warm light-grey paper backdrop filling the whole frame, no lighting equipment visible, large softbox key light from the left, soft natural shadow on the floor. A 27-year-old Brazilian man, medium-brown skin, short dark curly hair with a low fade, light stubble, slim athletic build, loose light-blue straight jeans and white sneakers. He is caught mid-movement walking away and turning, back to the camera, one arm swinging: the black heavyweight oversized boxy cotton t-shirt is in real motion, hem and sleeves flaring and swinging, realistic fabric ripples and folds, slight motion blur only at the hem. On the back of the shirt EXACTLY the print from 图片1, white ink with the small yellow 'Brazilian Bayle' signature, large and centered on the upper back, every letter and the parrot drawing identical, real print texture following the moving fabric. Full body from head to shoes, vertical. Real skin texture, natural hands, true-to-life colors, crisp focus on the print, editorial streetwear lookbook. No other text, no watermark.
```

**Mulher** (estampa 21):

```
Real fashion e-commerce studio photograph, shot on a Canon EOS R5 with an 85mm lens, seamless warm light-grey paper backdrop filling the whole frame, no lighting equipment visible, large softbox key light from the left, soft natural shadow on the floor. A 25-year-old Brazilian woman, light-brown skin, long dark wavy hair loose, natural makeup, slim build, loose black baggy jeans and black sneakers. She is caught mid-spin, back to the camera, hair flying, arms slightly out: the black heavyweight oversized boxy cotton t-shirt is in real motion, hem and sleeves flaring and swinging, realistic fabric ripples and folds, slight motion blur only at the hem and hair ends. On the back of the shirt EXACTLY the print from 图片1, white ink, large and centered on the upper back, every letter and drawing identical, real print texture following the moving fabric. Full body from head to shoes, vertical. Real skin texture, natural hands, true-to-life colors, crisp focus on the print, editorial streetwear lookbook. No other text, no watermark.
```
