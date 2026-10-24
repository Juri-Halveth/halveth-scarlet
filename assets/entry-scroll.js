/* Fresh entries start at the stage; history returns and content anchors keep their place. */
(() => {
  'use strict';
  const navigation = performance.getEntriesByType('navigation')[0];
  const appFragment = document.currentScript?.dataset.entryFragments === 'application';
  if (navigation?.type === 'back_forward' || (location.hash.length > 1 && !appFragment)) return;

  let pending = true;
  const restoreBrowser = () => {
    pending = false;
    if ('scrollRestoration' in history) history.scrollRestoration = 'auto';
  };
  const startAtTop = () => {
    if (pending) window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  };
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  for (const type of ['pointerdown', 'touchstart', 'wheel', 'keydown']) {
    window.addEventListener(type, restoreBrowser, { once: true, passive: true, capture: true });
  }
  document.addEventListener('DOMContentLoaded', startAtTop, { once: true });
  window.addEventListener('load', startAtTop, { once: true });
  window.addEventListener('pageshow', event => {
    if (event.persisted) restoreBrowser();
    else startAtTop();
  });
  window.addEventListener('pagehide', restoreBrowser);
  document.fonts?.ready.then(startAtTop);
})();
