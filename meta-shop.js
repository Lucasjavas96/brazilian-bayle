(() => {
  const pixel = '4497838140527275';
  const key = 'brb-meta-consent-v1';
  const panel = document.querySelector('#meta-consent');
  if (!panel || !['brazilianbayle.com.br','www.brazilianbayle.com.br'].includes(location.hostname)) return;
  const settings = document.querySelector('#meta-settings');
  let choice;
  try { choice = localStorage.getItem(key); } catch { return; }
  function track(event, data = {}, eventID) {
    if (choice !== 'yes' || !window.fbq) return;
    const marker = eventID && 'brb-meta-' + eventID;
    try {
      if (marker && localStorage.getItem(marker)) return;
      window.fbq('trackSingle', pixel, event, {content_category:'loja', ...data}, eventID ? {eventID} : {});
      if (marker) localStorage.setItem(marker, '1');
    } catch { /* Analytics must never interrupt checkout. */ }
  }
  function start() {
    if (!window.fbq) {
      const fbq = function() { if (fbq.callMethod) fbq.callMethod.apply(fbq, arguments); else fbq.queue.push(arguments); };
      fbq.queue = []; fbq.loaded = true; fbq.version = '2.0'; fbq.push = fbq;
      window.fbq = window._fbq = fbq;
      fbq('set','autoConfig',false,pixel);
      fbq('init',pixel);
      const script = document.createElement('script');
      script.async = true; script.src = 'https://connect.facebook.net/en_US/fbevents.js';
      document.head.append(script);
    }
    window.fbq('consent','grant');
    track('PageView');
    const product = document.querySelector('#pdp')?.dataset.product;
    if (product) track('ViewContent',{content_type:'product',content_ids:[product]});
  }
  window.brbShopMetric = track;
  settings.hidden = false;
  settings.onclick = () => { panel.hidden = false; panel.querySelector('button').focus(); };
  panel.onclick = event => {
    const value = event.target.dataset.choice;
    if (!value) return;
    const previous = choice;
    try { localStorage.setItem(key,value); } catch { return; }
    choice = value; panel.hidden = true;
    if (value === 'yes' && previous !== 'yes') start();
    if (value === 'no') window.fbq?.('consent','revoke');
  };
  panel.hidden = !!choice;
  if (choice === 'yes') start();
})();
