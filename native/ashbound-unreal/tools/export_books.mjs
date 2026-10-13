import { writeFileSync } from 'node:fs';
import { BOOKS } from '../../../forschung/ashbound/play/books.mjs';

const destination = process.argv[2];
if (!destination) throw new Error('Expected a destination JSON path');
if (!Array.isArray(BOOKS) || BOOKS.length < 3) throw new Error('ASHBOUND book source is incomplete');

const volumes = BOOKS.map(({ id, title, author, pages }) => {
  if (![id, title, author].every(value => typeof value === 'string' && value.length > 0) ||
      !Array.isArray(pages) || pages.length !== 3 ||
      !pages.every(page => typeof page === 'string' && page.length > 0)) {
    throw new Error(`Invalid ASHBOUND source volume: ${id}`);
  }
  return { id, title, author, pages };
});

writeFileSync(destination, JSON.stringify({ source: 'forschung/ashbound/play/books.mjs', volumes }, null, 2), 'utf8');
console.log(`Exported ${volumes.length} existing ASHBOUND volumes to ${destination}`);
