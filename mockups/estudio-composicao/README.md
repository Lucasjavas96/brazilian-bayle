# Três pilotos por composição gráfica

**Atualização:** as16 composições restantes foram produzidas e reunidas com os3 pilotos, sem modificá-los. [Abrir a coleção de19 fotos](lote/galeria.html) · [Método e verificações do lote](lote/README.md). Nada foi publicado na vitrine.

Pilotos para validação visual antes de refazer o restante do lote. Nada foi publicado no site.

## Arquivos

- `pilotos/08-piloto-composicao.png`: oversized preta masculina, caminhada.
- `pilotos/24-piloto-composicao.png`: oversized off-white feminina, pequeno salto com os dois pés fora do chão.
- `pilotos/21-piloto-composicao.png`: cropped preta feminina, giro.
- `pilotos/*-camada-estampa.png`: camadas transparentes, separadas da fotografia.
- `artes/`: fontes gráficas preservadas em3543×5906px. Versões08/23/24 com substituição técnica do ícone e21 copiada byte a byte do original.
- `bases/`: fotos sem estampa geradas por OpenAI image_gen a partir dos modelos de referência.
- `composicao-manifest.json`: hashes, testes, coordenadas dos quatro cantos e resolução real.
- `compor_pilotos.py`: composição reproduzível no repositório; usa Pillow, NumPy e OpenCV.

## Método e limites

A IA gerou somente a pessoa com a peça lisa. A estampa não foi enviada para geração de letras. A arte original foi aplicada por transformação de perspectiva, deslocamento pequeno guiado pelas dobras fotografadas e iluminação/textura do tecido. Trata-se de uma aproximação gráfica2D, sem simulação física3D.

O papagaio das artes08/23/24 foi substituído pelo arquivo oficial `produtos/_marca/icone-oficial/papagaio-icone-oficial-transparente.png`. A geometria não foi redesenhada; foi feita separação monocromática pelo canal verde para conservar os detalhes como transparência nas versões de uma tinta. Isso é uma versão de impressão monocromática, não o PNG colorido intacto. Letras, ondas e assinatura originais foram preservadas.

Testes executados: comparação exata dos pixels da tipografia e tinta protegida (ondas e assinatura) das artes08/23/24; SHA-256 idêntico para a arte21. Essas verificações se aplicam às **fontes gráficas**: na foto, a perspectiva e a textura necessariamente transformam os pixels.

**Resolução das fotos bases e pilotos:1086×1448px (3:4).** O gerador retornou essa resolução apesar do pedido maior; os pilotos não foram ampliados para aparentar2K. As fontes gráficas continuam em sua resolução original, sem redução para impressão.

## Validação antes do lote

Conferir tamanho/posição da estampa, aparência da tinta sobre tecido, adequação do ícone monocromático e modelagem/pose. Após essa validação, repetir o processo para as demais peças. As prévias anteriores em `../estudio-kling/` não são o lote final aprovado.

