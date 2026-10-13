import { GAME_SAVE_KEY, freshGame, loadGame } from './game-core.mjs';

export function restoreGame(storage, now = Date.now) {
  let raw;
  try {
    raw = storage.getItem(GAME_SAVE_KEY);
  } catch {
    // A failed read cannot establish that the old key is empty. Never replace it.
    return { game: freshGame(), recovery: null, saveProtected: true, storageUnreadable: true };
  }
  if (raw === null) return { game: freshGame(), recovery: null, saveProtected: false, storageUnreadable: false };
  try {
    return { game: loadGame(JSON.parse(raw)), recovery: null, saveProtected: false, storageUnreadable: false };
  } catch {
    const base = `${GAME_SAVE_KEY}-recovery-${now()}`;
    let backupKey = null;
    try {
      for (let attempt = 0; attempt < 100; attempt++) {
        const candidate = `${base}${attempt ? `-${attempt}` : ''}`;
        if (storage.getItem(candidate) !== null) continue;
        storage.setItem(candidate, raw);
        if (storage.getItem(candidate) === raw) { backupKey = candidate; break; }
      }
    } catch { /* Keep the original save key untouched when backup fails. */ }
    return { game: freshGame(), recovery: { raw, backupKey },
      saveProtected: backupKey === null, storageUnreadable: false };
  }
}

export function writeGameSave(storage, game) {
  try {
    const raw = JSON.stringify(game);
    storage.setItem(GAME_SAVE_KEY, raw);
    return storage.getItem(GAME_SAVE_KEY) === raw;
  } catch {
    return false;
  }
}
