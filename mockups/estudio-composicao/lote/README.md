# Coleção08–26 por composição gráfica

Conjunto para revisão visual: **19 fotos**, sendo os3 pilotos preservados e16 composições restantes. **Não publicado na loja.**

- [Galeria](galeria.html) · [Prancha completa](prancha-19-composicao.jpg).
- `fotos/`:19 imagens em1086×1448px, formato3:4, sem ampliação artificial.
- `bases/`: peças sem estampa.15 bases novas;23 reaproveita a base masculina08 como variação branca do mesmo produto.
- `artes/`: fontes gráficas. Nas15 peças sem mudança de ícone, os arquivos são cópias byte a byte das estampas originais do repositório.
- `camadas/`: registro transparente da estampa aplicada em cada fotografia.
- `manifesto-composicao.json`: hashes, cores, modelagens, coordenadas de aplicação e confirmação de preservação dos pilotos.
- `prompts-bases.json`: prompts usados apenas para gerar modelos/peças lisas, sem letras ou estampas.

## Processo

IA apenas nas bases fotográficas. A tipografia e os desenhos vieram dos PNGs originais, aplicados por perspectiva, deslocamento leve guiado pelas dobras e textura/iluminação do tecido. As artes08/23/24 usam o arquivo oficial do papagaio em separação monocromática, conforme os pilotos; nenhum ícone foi redesenhado por IA nesta etapa. Croppeds11–13 e17–22 seguem as categorias do PR20 e usam a mulher.

Os pilotos08,21 e24 foram copiados para a coleção final sem recomposição: os hashes das fotos continuam idênticos. A23 usa a arte branca original com o ícone oficial aplicado pelo mesmo processo do piloto08.

As poses das bases são interpretações fotográficas geradas a partir das instruções de caminhada, giro, dança e salto. O resultado da aplicação é uma aproximação2D e deve ser revisado visualmente; não é simulação física3D nem fotografia de amostra real.

## Resolução e arquivos de impressão

As fotos bases continuam em1086×1448px, abaixo dos2K do briefing original. As fontes gráficas mantêm suas dimensões originais e foram preservadas separadamente. Não usar a fotografia do mockup como matriz de impressão.

## Reprodução

No repositório, executar `python mockups/estudio-composicao/compor_lote.py` com Pillow, NumPy e OpenCV disponíveis. O script utiliza as bases já salvas, recompõe as16 peças e reúne os3 pilotos. Os arquivos anteriores e a vitrine atual não são alterados.
