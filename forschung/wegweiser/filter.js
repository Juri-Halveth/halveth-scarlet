/* © 2026 Juri Janovski (Projekt HALVETH). Original contributions under HALVETH PIRL 2.0; see ../../LICENSES.md. */
(() => {
  'use strict';
  const input = document.getElementById('work-search');
  const cards = [...document.querySelectorAll('.work-card')];
  const sections = [...document.querySelectorAll('.collection')];
  const status = document.getElementById('search-status');
  const empty = document.getElementById('no-results');
  if (!input || !cards.length || !status || !empty) return;
  const normalize = value => value.toLocaleLowerCase('de').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const labels = cards.map(card => normalize(`${card.dataset.search || ''} ${card.textContent || ''}`));
  function update() {
    const query = normalize(input.value.trim());
    let visible = 0;
    cards.forEach((card, index) => {
      card.hidden = Boolean(query && !labels[index].includes(query));
      if (!card.hidden) visible++;
    });
    sections.forEach(section => { section.hidden = !section.querySelector('.work-card:not([hidden])'); });
    empty.hidden = visible !== 0;
    status.textContent = query ? `${visible} Treffer für „${input.value.trim()}“` : `${cards.length} öffentliche Wege`;
  }
  input.addEventListener('input', update);
})();
