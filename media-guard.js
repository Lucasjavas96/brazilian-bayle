/* Interface deterrents, not DRM. Publicly displayed media can still be copied. */
(() => {
 const media = target => target instanceof Element && target.closest('img,video');
 document.addEventListener('dragstart', e => { if (media(e.target)) e.preventDefault(); });
 document.addEventListener('contextmenu', e => { if (media(e.target)) e.preventDefault(); });
 function protect(node) {
  if (!(node instanceof Element)) return;
  const entries = [...node.querySelectorAll('img,video')];
  if (node.matches('img,video')) entries.push(node);
  entries.forEach(el => { el.draggable = false; if (el.tagName === 'VIDEO') { el.setAttribute('controlslist','nodownload noremoteplayback'); el.disablePictureInPicture = true; el.disableRemotePlayback = true; } });
 }
 protect(document.documentElement);
 new MutationObserver(records => records.forEach(r => r.addedNodes.forEach(protect))).observe(document.body,{childList:true,subtree:true});
})();
