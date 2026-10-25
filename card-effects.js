/* One shared perimeter treatment. Separate overlay preserves each card's art,
   existing pseudo-elements, flips and interactive controls. */
(() => {
 const selector = '.account-card,.account-callout,.wiki-item,.vote-wizard,.preseason,.club-card,.shop-campaign,.memory-card,.event,.next-card,.plan,.vote-card,.apply-form,.drop-form,.rev,.shop-product,.cwb-card,.dp-card,.ge-card,.pod,.sp-front,.sp-back,.djc-face,.ab-stats>div';
 function decorate(root) {
  if (!(root instanceof Element)) return;
  const cards = [...root.querySelectorAll(selector)];
  if (root.matches(selector)) cards.push(root);
  cards.forEach(card => {
   card.classList.add('brb-orbit-card');
   const style = getComputedStyle(card), sticker = card.closest('.djc');
   if (style.position === 'static') card.classList.add('brb-static-card');
   // Album rarity colors are authored on the parent; medals use --metal.
   // Other surfaces use their own visible border, then the shared gold token.
   let color = sticker ? getComputedStyle(sticker).getPropertyValue('--line').trim()
    : style.getPropertyValue('--metal').trim() ||
     (style.borderTopStyle !== 'none' && style.borderTopColor !== 'rgba(0, 0, 0, 0)' ? style.borderTopColor : style.getPropertyValue('--gold').trim());
   // Static borders may be translucent; the moving light keeps their hue
   // while using full opacity so it remains visible on the dark surface.
   const rgba = color.match(/^rgba\((\d+),\s*(\d+),\s*(\d+),[^)]+\)$/);
   if (rgba) color = `rgb(${rgba[1]}, ${rgba[2]}, ${rgba[3]})`;
   card.style.setProperty('--card-edge-color', color || '#c9a45c');
   if ([...card.children].some(child => child.classList.contains('brb-card-edge'))) return;
   const edge = document.createElement('span');
   edge.className = 'brb-card-edge'; edge.setAttribute('aria-hidden','true');
   const ns = 'http://www.w3.org/2000/svg';
   const svg = document.createElementNS(ns,'svg');
   const track = document.createElementNS(ns,'rect');
   track.setAttribute('pathLength','100');
   track.setAttribute('vector-effect','non-scaling-stroke');
   const radius = parseFloat(style.borderTopLeftRadius) || 0;
   track.setAttribute('rx',String(Math.max(0,radius - 1.5)));
   svg.append(track); edge.append(svg);
   card.append(edge);
  });
 }
 decorate(document.body);
 new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(decorate)))
  .observe(document.body,{childList:true,subtree:true});
})();
