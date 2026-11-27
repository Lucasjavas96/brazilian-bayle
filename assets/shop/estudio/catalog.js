(() => {
  const dialog=document.querySelector('.studio-dialog');
  if(!dialog)return;
  document.querySelectorAll('[data-studio-card]').forEach(card=>{
    const image=card.querySelector('.studio-photo img');
    const title=card.querySelector('h3').textContent;
    card.querySelectorAll('[data-studio-variant]').forEach(button=>button.addEventListener('click',()=>{
      card.querySelectorAll('[data-studio-variant]').forEach(other=>other.setAttribute('aria-pressed',String(other===button)));
      image.src=button.dataset.image;image.alt=title+' · '+button.dataset.label+' · vista das costas';
      const buy=card.querySelector('[data-studio-buy]');
      buy.hidden=!button.dataset.buy;buy.href=button.dataset.buy||'#';
      card.querySelector('[data-studio-state]').hidden=!!button.dataset.buy;
    }));
    card.querySelector('[data-studio-open]').addEventListener('click',()=>{
      dialog.querySelector('h2').textContent=title;
      const full=dialog.querySelector('img');full.src=image.src;full.alt=image.alt;
      dialog.querySelector('[data-studio-dialog-label]').textContent=card.querySelector('[aria-pressed=true]').dataset.label;
      dialog.showModal();
    });
  });
  dialog.querySelector('[data-studio-close]').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close()});
})();
