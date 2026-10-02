(function () {
  'use strict';
  const script = document.currentScript;
  if (!script || document.getElementById('ashbound-entry')) return;
  const base = new URL('../', script.src);
  const link = document.createElement('a');
  link.id = 'ashbound-entry';
  link.className = 'entity-bubble';
  link.style.setProperty('--bubble-tone', '#b5ecd9');
  link.style.setProperty('--delay', '0s');
  link.style.letterSpacing = '0';
  link.style.animation = 'none';
  const render = () => {
    const lang = document.documentElement.lang.startsWith('en') ? 'en' : 'de';
    link.href = new URL('forschung/morrowind-lernwelt/?lang=' + lang, base).href;
    link.textContent = 'ASHBOUND / Morrowind';
    link.setAttribute('aria-label', lang === 'en' ? 'ASHBOUND / Enter Morrowind' : 'ASHBOUND / Morrowind betreten');
    link.title = link.getAttribute('aria-label');
  };
  render();
  const navigation = document.querySelector('.constellation-left');
  if (navigation) navigation.prepend(link);
  new MutationObserver(render).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
})();
