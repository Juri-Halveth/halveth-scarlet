export const TIMELINE_KEY = 'halveth-character-moments-v1';
export const MAX_MOMENTS = 80;
export const MOMENT_SCHEMA = 'halveth.character-moments.v1';

export function orderedEntities(entities) {
  const preferred = ['scarlet', 'rachel', 'lucinet', 'dormammu', 'ego', 'strange', 'juri', 'verachel', 'mira', 'mita', 'halveth'];
  const seen = new Set();
  for (const entity of entities) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entity.id) || seen.has(entity.id)) throw new Error('Invalid entity registry');
    seen.add(entity.id);
  }
  return [...entities].sort((a, b) => {
    const rank = id => preferred.includes(id) ? preferred.indexOf(id) : preferred.length;
    return rank(a.id) - rank(b.id) || entities.indexOf(a) - entities.indexOf(b);
  });
}

export function matchingEntities(entities, query) {
  const fold = value => value.normalize('NFC').toLocaleLowerCase('de-DE').replace(/\u00df/g, 'ss');
  const needle = fold(query.trim());
  return entities.filter(entity => fold([entity.id, entity.label, entity.role, entity.en.role].join(' ')).includes(needle));
}

export function neighbors(entities, selected, limit = 4) {
  return entities.filter(entity => entity.id !== selected.id && entity.section === selected.section).slice(0, limit);
}

export function appendMoment(moments, entityId, recordedAt, ids) {
  if (!ids.has(entityId) || !Number.isFinite(Date.parse(recordedAt)) || new Date(recordedAt).toISOString() !== recordedAt) throw new Error('Invalid moment');
  return [...moments, { entityId, recordedAt }].slice(-MAX_MOMENTS);
}

export function readMoments(raw, ids) {
  if (raw === null) return { moments: [], state: 'EMPTY' };
  try {
    if (raw.length > 20000) throw new Error('Oversized timeline');
    const value = JSON.parse(raw);
    if (value.schema !== MOMENT_SCHEMA || !Array.isArray(value.moments) || value.moments.length > MAX_MOMENTS) throw new Error('Invalid timeline');
    for (const m of value.moments) {
      if (!m || Object.keys(m).sort().join(',') !== 'entityId,recordedAt' || !ids.has(m.entityId) || typeof m.recordedAt !== 'string' || new Date(m.recordedAt).toISOString() !== m.recordedAt) throw new Error('Invalid moment');
    }
    return { moments: value.moments, state: 'LOADED' };
  } catch {
    return { moments: [], state: 'INVALID_PRESERVED' };
  }
}

export function galleryPosition(index, count) {
  const columns = Math.ceil(Math.sqrt(count * 1.35));
  const rows = Math.ceil(count / columns);
  return [(index % columns - (columns - 1) / 2) * 3.3, 0, (Math.floor(index / columns) - (rows - 1) / 2) * 4.2];
}
