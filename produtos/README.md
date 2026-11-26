# Produtos Brazilian Bayle

Toda arte de produto mora aqui, separada por **categoria** e **tipo de peça**. A pasta diz para qual produto a estampa foi feita. Estampa de cropped nunca vai pra oversized, e vice-versa.

```
produtos/
  masculino/
    oversized/   camisetas oversized masculinas
    regata/
  feminino/
    oversized/
    cropped/
    biquini/
  acessorios/
    bone/
    leque/
    chinelo/
  _marca/        logo oficial (papagaio) em SVG, PNG e PDF
  _historico/    READMEs antigos das pastas estampas-costas e mockups
```

## Dentro de cada estampa

```
produtos/feminino/cropped/sorry-i-only-date-djs/
  estampa-costas/   PNG de impressão (3543 x 5906, 300 dpi, fundo transparente)
                    uma por cor de tinta: 17-...-verde.png, 18-...-branco.png, 19-...-preto.png
  estampa-frente/   (se tiver arte na frente)
  mockups/          mockups de apresentação, nunca para impressão
  fotos-estudio/    fotos com modelo (Kling etc.)
  originais/        arquivo bruto que veio do designer, antes de tratar
```

O número na frente do arquivo (08, 17, 23...) é o número de entrada da estampa e continua subindo. A próxima estampa nova é a **27**.

Regra de cor: tinta branca só em camiseta escura, tinta preta só em camiseta clara.

## Como adicionar uma estampa nova

1. Escolha o tipo de peça e crie a pasta: `produtos/<categoria>/<tipo>/<nome-da-estampa>/estampa-costas/`.
2. Salve o PNG com o próximo número: `27-nome-da-estampa.png`.
3. Se a mesma frase vai em dois produtos (ex.: oversized e cropped), crie uma pasta em cada tipo. O tamanho da arte muda de uma peça para outra.

## Como criar um tipo de peça ou categoria nova

1. Adicione a linha em `src/data/categorias.json` (ex.: `{ "id": "bermuda", "nome": "Bermuda", "rotulo": "Bermuda" }` dentro de Masculino).
2. Crie a pasta `produtos/masculino/bermuda/`.

O build (`node _local/build.js`) para com erro se aparecer uma pasta aqui que não está em `categorias.json`, ou se um produto da loja usar uma categoria que não existe.

## Ligação com a loja do site

- `src/data/categorias.json`: lista de categorias e tipos de peça.
- `src/data/produtos.json`: camisetas oversized à venda, cada uma com `"categoria": "masculino/oversized"`.
- `src/data/croppeds.json`: croppeds à venda, com `"categoria": "feminino/cropped"`.
- As abas da loja (Masculino, Feminino, Acessórios) são geradas dessa lista e só aparecem quando a categoria tem produto à venda.
- Preço, tamanhos e se está ativo vêm da tabela `brb_shop_products` no Supabase.

`manifesto-tecnico.json` guarda resolução e hash de cada PNG de impressão.

## Limites de produção

As estampas foram ampliadas a partir de imagens menores (900 x 1600 até 1080 x 1920). A ampliação atende o tamanho de arquivo pedido pela gráfica, mas não recupera detalhes. Precisa de prova da gráfica para validar recorte, nitidez e processo DTG.
