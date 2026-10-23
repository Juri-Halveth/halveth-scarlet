const filters = [...document.querySelectorAll('[data-filter]')];
const cards = [...document.querySelectorAll('.atlas-card')];
const counter = document.querySelector('#atlas-count');

function selectFilter(tag) {
  for (const button of filters) button.setAttribute('aria-pressed', String(button.dataset.filter === tag));
  let visible = 0;
  for (const card of cards) {
    const show = tag === 'alle' || card.dataset.tags.split(' ').includes(tag);
    card.hidden = !show;
    if (show) visible += 1;
  }
  counter.textContent = `${visible} ${visible === 1 ? 'Weg' : 'Wege'} sichtbar`;
}

for (const button of filters) button.addEventListener('click', () => selectFilter(button.dataset.filter));
