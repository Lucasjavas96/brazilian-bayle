const fs = require('fs');
const path = require('path');
const esc = s => String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
module.exports = (root, collection) => {
  const products = JSON.parse(fs.readFileSync(path.join(root,'src/data/shop-studio.json'),'utf8')).filter(p=>p.collection===collection);
  const feminine=collection==='feminino';
  const cards=products.map(p=>{
    const v=p.variants[0];
    return `<article class="studio-card" data-studio-card><button type="button" class="studio-photo" data-studio-open aria-label="Ampliar ${esc(p.name)}"><img src="${v.image}" alt="${esc(p.name)} · ${esc(v.label)} · vista das costas" width="1086" height="1448" loading="lazy"><span>Ampliar ↗</span></button><div class="studio-info"><h3>${esc(p.name)}</h3><p>${esc(p.type)}</p><div class="studio-variants" role="group" aria-label="Variações de ${esc(p.name)}">${p.variants.map((variant,i)=>`<button type="button" data-studio-variant data-image="${variant.image}" data-label="${esc(variant.label)}" data-buy="${esc(variant.href||'')}" aria-pressed="${!i}">${esc(variant.label)}</button>`).join('')}</div><p class="studio-state" data-studio-state${v.href?' hidden':''}>Prévia da nova coleção</p><a class="btn btn-y studio-buy" data-studio-buy href="${v.href||'#'}"${v.href?'':' hidden'}>Comprar</a></div></article>`;
  }).join('');
  return `<section class="studio-collection" id="${feminine?'feminina':'novas-estampas'}" aria-labelledby="studio-heading"><header class="studio-heading"><p>BRAZILIAN BAYLE · ESTÚDIO</p><h2 id="studio-heading">${feminine?'Croppeds femininos.':'Novas estampas.'}</h2><p>Escolha a variação e veja a estampa de perto.</p></header><div class="studio-grid">${cards}</div></section><dialog class="studio-dialog" aria-labelledby="studio-dialog-title"><button class="studio-close" type="button" data-studio-close aria-label="Fechar ampliação">Fechar ×</button><h2 id="studio-dialog-title"></h2><img alt="" width="1086" height="1448"><p data-studio-dialog-label></p></dialog>`;
};
