export const KERNEL_VERSION = '1.0.0';

const UINT32_MAX = 0xffffffff;

function assertWord(value) {
  if (!Number.isInteger(value) || value < 0 || value > UINT32_MAX) throw new TypeError('word must be an unsigned 32-bit integer');
  return value >>> 0;
}

function assertBit(value) {
  if (!Number.isInteger(value) || value < 0 || value > 31) throw new RangeError('bit must be between 0 and 31');
  return value;
}

export function bitGroups(value) {
  return assertWord(value).toString(2).padStart(32, '0').match(/.{1,8}/g);
}

export function hexWord(value) {
  return '0x' + assertWord(value).toString(16).padStart(8, '0').toUpperCase();
}

export function compareWords(left, right) {
  left = assertWord(left); right = assertWord(right);
  const delta = (left ^ right) >>> 0;
  let changedBits = 0;
  for (let remainder = delta; remainder; remainder >>>= 1) changedBits += remainder & 1;
  return Object.freeze({
    equal: delta === 0,
    relation: delta === 0 ? '=' : '!',
    delta,
    changedBits
  });
}

export function createKernel(seed = 0x4a555249) {
  const word = assertWord(seed);
  return Object.freeze({ version: KERNEL_VERSION, seed: word, word, revision: 0, lastBit: null, comparison: compareWords(word, word) });
}

export function toggleBit(state, bit) {
  if (!state || typeof state !== 'object') throw new TypeError('kernel state required');
  bit = assertBit(bit);
  const seed = assertWord(state.seed);
  const word = (assertWord(state.word) ^ (2 ** bit)) >>> 0;
  return Object.freeze({
    version: KERNEL_VERSION,
    seed,
    word,
    revision: Number.isInteger(state.revision) ? state.revision + 1 : 1,
    lastBit: bit,
    comparison: compareWords(seed, word)
  });
}
