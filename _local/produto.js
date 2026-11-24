/* Página de produto da loja: uma URL indexável por estampa (/loja/<slug>).
   Dados em src/data/produtos.json. Preço, tamanhos e disponibilidade reais vêm do
   checkout (commerce.js atualiza a página se o valor do servidor for diferente). */
const PRICE_CENTS = 14990;
const SIZES = ["P", "M", "G", "GG", "XG"];
const COLORS = [["preta", "Preta", "#0b0b0b"], ["off-white", "Off-white", "#ece6d8"], ["cinza", "Cinza", "#8a8a86"]];
const MEASURES = [["P", "56,5", "72", "21"], ["M", "60", "77", "22"], ["G", "61", "77,5", "22,5"], ["GG", "65", "84", "23,5"], ["XG", "65,5", "88,5", "23,5"]];

const esc = s => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const money = c => "R$ " + (c / 100).toFixed(2).replace(".", ",");
const shot = (id, kind) => `/assets/shop/bayle/${id}-${kind}.webp`;
const backPhoto = (id, color) => `/assets/shop/bayle/${id}${color === "preta" ? "" : "-" + color}-costas.webp`;

function schema(p, SITE, url) {
  const policy = { "@type": "MerchantReturnPolicy", "@id": `${SITE}/loja#devolucao`, applicableCountry: "BR", returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow", merchantReturnDays: 7, returnMethod: "https://schema.org/ReturnByMail" };
  const variants = COLORS.flatMap(([color, label]) => SIZES.map(size => ({
    "@type": "Product",
    sku: `${p.id}-${color}-${size}`.toUpperCase(),
    name: `Camiseta Oversized ${p.name} · ${label} · ${size}`,
    image: SITE + backPhoto(p.id, color),
    color: label,
    size,
    offers: { "@type": "Offer", url: `${url}?cor=${color}&tamanho=${size}`, price: (PRICE_CENTS / 100).toFixed(2), priceCurrency: "BRL", availability: "https://schema.org/InStock", itemCondition: "https://schema.org/NewCondition", hasMerchantReturnPolicy: { "@id": policy["@id"] } },
  })));
  return [
    { "@context": "https://schema.org", "@graph": [
      policy,
      { "@type": "ProductGroup", "@id": url + "#produto", productGroupID: p.id.toUpperCase(), name: `Camiseta Oversized ${p.name}`, description: `${p.lede} ${p.story}`, url,
        brand: { "@type": "Brand", name: "Brazilian Bayle" }, category: "Vestuário > Camisetas", audience: { "@type": "PeopleAudience", suggestedGender: "unisex" },
        image: [SITE + shot(p.id, "costas"), SITE + shot(p.id, "frente"), SITE + shot(p.id, "completo")],
        variesBy: ["https://schema.org/color", "https://schema.org/size"], hasVariant: variants },
    ] },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Início", item: SITE + "/" },
      { "@type": "ListItem", position: 2, name: "Loja", item: SITE + "/loja" },
      { "@type": "ListItem", position: 3, name: `Camiseta ${p.name}`, item: url },
    ] },
  ];
}

function body(p, all) {
  const others = all.filter(o => o.id !== p.id);
  const colorInputs = COLORS.map(([value, label, hex], i) =>
    `<label class="pdp-swatch"><input type="radio" name="color" value="${value}"${i ? "" : " checked"}><span style="--swatch:${hex}" aria-hidden="true"></span><b>${label}</b></label>`).join("");
  const sizeInputs = SIZES.map(s => `<label class="pdp-size"><input type="radio" name="size" value="${s}" required><span>${s}</span></label>`).join("");
  return `<header class="commerce-nav"><a href="/loja" class="commerce-brand"><img src="/assets/shop/bayle/papagaio-oficial.svg" alt="Brazilian Bayle" width="28" height="48"><span>BRAZILIAN <em>Bayle</em></span></a><div class="commerce-nav-links"><a href="/loja#catalogo">Coleção</a><button type="button" class="commerce-help" data-support-open aria-haspopup="dialog" aria-controls="supportDialog">Ajuda</button><a href="/sacola">Sacola (<span data-cart-count>0</span>)</a></div></header>
<div class="pdp" id="pdp" data-product="${p.id}" data-name="${esc(p.name)}" data-price="${PRICE_CENTS}">
<nav class="pdp-crumbs" aria-label="Você está em"><ol><li><a href="/">Início</a></li><li><a href="/loja">Loja</a></li><li aria-current="page">${esc(p.name)}</li></ol></nav>
<div class="pdp-top">
<section class="pdp-gallery" aria-label="Fotos da camiseta ${esc(p.name)}">
<ul class="pdp-slides" id="pdpSlides">
<li class="pdp-slide pdp-slide-main"><img id="pdpBack" src="${shot(p.id, "costas")}" alt="Camiseta ${esc(p.name)} preta, vista de costas: ${esc(p.art)}" width="768" height="1024" fetchpriority="high"></li>
<li class="pdp-slide"><img src="${shot(p.id, "frente")}" alt="Camiseta ${esc(p.name)} preta, vista de frente com o papagaio verde no peito" width="768" height="1024" loading="lazy"></li>
${p.noVideo ? "" : `<li class="pdp-slide"><video src="/assets/shop/bayle/andando/${p.id}-andando.mp4" poster="/assets/shop/bayle/andando/${p.id}-andando.webp" width="720" height="720" muted loop playsinline autoplay preload="none" aria-label="Vídeo da camiseta ${esc(p.name)} no corpo, girando"></video></li>`}
<li class="pdp-slide pdp-slide-wide"><img src="${shot(p.id, "completo")}" alt="Camiseta ${esc(p.name)} preta, frente e costas lado a lado" width="1536" height="1024" loading="lazy"></li>
</ul>
<p class="pdp-dots" aria-hidden="true"><i></i><i></i><i></i>${p.noVideo ? "" : "<i></i>"}</p>
<p class="pdp-mock">Mockup ilustrativo da cor selecionada.</p>
</section>
<section class="pdp-buy" aria-labelledby="pdpTitle">
<p class="pdp-kicker">Camiseta oversized · Coleção própria</p>
<h1 id="pdpTitle">${esc(p.name)}</h1>
<p class="pdp-lede">${esc(p.lede)}</p>
<p class="pdp-price"><strong data-pdp-price>${money(PRICE_CENTS)}</strong><span>no Pix ou no cartão</span></p>
<form id="pdpForm" class="pdp-form" novalidate>
<fieldset class="pdp-colors"><legend>Cor: <output id="pdpColorName">Preta</output></legend><div>${colorInputs}</div></fieldset>
<fieldset class="pdp-sizes" aria-describedby="pdpFit"><legend>Tamanho<a href="#medidas" class="pdp-guide-link">Tabela de medidas</a></legend><div>${sizeInputs}</div></fieldset>
<p class="pdp-fit" id="pdpFit">Modelagem oversized: mais larga e mais comprida que a camiseta tradicional. No tamanho M, 60 cm de largura e 77 cm de comprimento.</p>
<p class="commerce-error" id="pdpError" role="alert"></p>
<button class="commerce-primary pdp-cta" type="submit" name="intent" value="buy" id="pdpBuy">Comprar agora</button>
<button class="pdp-add" type="submit" name="intent" value="add">Adicionar à sacola e continuar vendo</button>
<div class="commerce-notice pdp-added" id="pdpAdded" role="status" hidden></div>
</form>
<form id="pdpFreight" class="pdp-freight" novalidate>
<label for="pdpCep">Calcule o frete e o prazo</label>
<div><input id="pdpCep" name="cep" inputmode="numeric" autocomplete="postal-code" placeholder="00000-000" maxlength="9" required><button type="submit">Calcular</button></div>
<p class="commerce-fine" id="pdpFreightResult" role="status" aria-live="polite"></p>
</form>
<ul class="pdp-trust">
<li><b>Pagamento seguro</b> pelo Mercado Pago, no Pix ou no cartão.</li>
<li><b>Entrega pelos Correios</b>, PAC ou SEDEX, para todo o Brasil.</li>
<li><b>7 dias para desistir</b> depois de receber, como garante o Código de Defesa do Consumidor.</li>
</ul>
</section>
</div>
<div class="pdp-info">
<section class="pdp-block" aria-labelledby="estampa"><h2 id="estampa">A estampa</h2><p>${esc(p.story)}</p></section>
<section class="pdp-block" aria-labelledby="detalhes"><h2 id="detalhes">Detalhes da peça</h2><ul class="pdp-list"><li>Camiseta oversized, de ombro caído e corpo amplo</li><li>Estampa grande nas costas: ${esc(p.art)}</li><li>Papagaio verde da Brazilian Bayle no peito</li><li>Cores: preta, off-white e cinza</li><li>Tamanhos do P ao XG</li></ul></section>
<section class="pdp-block" aria-labelledby="medidas-titulo" id="medidas"><h2 id="medidas-titulo">Tabela de medidas</h2><table class="pdp-table"><caption class="sr-only">Medidas da camiseta em centímetros</caption><thead><tr><th scope="col">Tamanho</th><th scope="col">Largura</th><th scope="col">Comprimento</th><th scope="col">Manga</th></tr></thead><tbody>${MEASURES.map(([s, w, l, m]) => `<tr><th scope="row">${s}</th><td>${w}</td><td>${l}</td><td>${m}</td></tr>`).join("")}</tbody></table><p class="pdp-note">Medidas da peça em centímetros. Para acertar, estenda uma camiseta sua sobre a mesa e compare a largura de axila a axila. Pode variar até 2 cm.</p></section>
<section class="pdp-block" aria-labelledby="duvidas"><h2 id="duvidas">Dúvidas frequentes</h2>
<details><summary>Qual tamanho escolher?</summary><p>A modelagem é oversized, então ela já veste larga. Compare a largura da tabela com uma camiseta que você gosta. Se quiser mais ajustada, escolha um tamanho abaixo do que você costuma usar.</p></details>
<details><summary>Quais são as formas de pagamento?</summary><p>Pix ou cartão de crédito, à vista, processados pelo Mercado Pago. O pagamento fica na página da Brazilian Bayle.</p></details>
<details><summary>Quanto custa o frete e quanto demora?</summary><p>Depende do CEP. Calcule acima ou na sacola: aparecem as opções PAC e SEDEX com valor e prazo em dias úteis.</p></details>
<details><summary>Posso desistir da compra?</summary><p>Sim. Você tem 7 dias depois de receber a peça para desistir, como garante o Código de Defesa do Consumidor (art. 49). Fale com a gente pelo botão Ajuda.</p></details>
</section>
</div>
<section class="pdp-more" aria-labelledby="outras"><h2 id="outras">Outras estampas da coleção</h2><ul>${others.map(o => `<li><a href="/loja/${o.slug}"><img src="${shot(o.id, "costas")}" alt="" width="768" height="1024" loading="lazy"><span>${esc(o.name)}</span><small>${money(PRICE_CENTS)}</small></a></li>`).join("")}</ul></section>
<p class="pdp-legal">Brazilian Bayle é um projeto independente, sem vínculo com os artistas citados nas estampas.</p>
<div class="pdp-bar" id="pdpBar" hidden><div><b>${esc(p.name)}</b><span data-pdp-price>${money(PRICE_CENTS)}</span></div><button type="button" class="commerce-primary" id="pdpBarBuy">Comprar</button></div>
</div>`;
}

module.exports = function productPages(products, SITE) {
  return products.map(p => {
    const url = `${SITE}/loja/${p.slug}`;
    return {
      rel: `loja/${p.slug}`,
      meta: {
        path: `/loja/${p.slug}`, nav: "produto", funnel: true,
        title: `Camiseta Oversized ${p.name}`,
        description: `Camiseta oversized ${p.name} da Brazilian Bayle, com estampa grande nas costas. Preta, off-white ou cinza, do P ao XG. ${money(PRICE_CENTS)}.`,
        ogImage: SITE + shot(p.id, "completo"), ogImageSize: [1536, 1024], ogImageAlt: `Camiseta ${p.name}, frente e costas`, ogType: "product",
        preload: `<link rel="preload" as="image" href="${shot(p.id, "costas")}" fetchpriority="high">`,
        jsonld: schema(p, SITE, url),
      },
      body: body(p, products),
    };
  });
};
module.exports.SIZES = SIZES;
