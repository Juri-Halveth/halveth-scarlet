(function () {
  'use strict';
  const script = document.currentScript;
  if (!script || document.getElementById('ashbound-entry')) return;
  const base = new URL('../', script.src);
  const link = document.createElement('a');
  link.id = 'ashbound-entry';
  const render = () => {
    const lang = document.documentElement.lang.startsWith('en') ? 'en' : 'de';
    link.href = new URL('forschung/morrowind-lernwelt/?lang=' + lang, base).href;
    link.textContent = lang === 'en' ? 'ASHBOUND / Enter Morrowind' : 'ASHBOUND / Morrowind betreten';
  };
  render();
  Object.assign(link.style, { position: 'fixed', left: '16px', bottom: '16px', zIndex: '45',
    maxWidth: 'calc(100vw - 90px)', padding: '9px 13px', background: '#142b23', color: '#d2f4df',
    border: '1px solid #89c3a2', borderRadius: '4px', font: '12px/1.4 system-ui', textDecoration: 'none' });
  document.body.append(link);
  new MutationObserver(render).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
})();
