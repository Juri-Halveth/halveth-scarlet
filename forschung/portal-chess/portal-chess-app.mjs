import {
  PIECE_GLYPHS,
  SIDES,
  applyMove,
  createInitialState,
  createSession,
  describePiece,
  getAttackedSquares,
  getGameStatus,
  getLegalMoves,
  getMissionStatus,
  isSession,
  replayMoveList
} from './portal-chess-core.mjs';

const STORAGE_KEY = 'halveth-portal-chess-session-v1';
const boardElement = document.querySelector('#board');
const missionOutput = document.querySelector('#mission-status');
const viewCaption = document.querySelector('#view-caption');
const turnOutput = document.querySelector('#turn-status');
const anchorOutput = document.querySelector('#anchor-status');
const moveOutput = document.querySelector('#move-status');
const details = document.querySelector('#mission-details');
const detailsToggle = document.querySelector('#details-toggle');
const resetButton = document.querySelector('#reset-board');
const moveList = document.querySelector('#move-list');
const replayButton = document.querySelector('#replay-moves');
const replayStatus = document.querySelector('#replay-status');
const toast = document.querySelector('#toast');
const boardButtons = [...document.querySelectorAll('[data-board]')];
const viewButtons = [...document.querySelectorAll('[data-view]')];

let session = loadSession();
let selected = null;
let view = 'position';
let toastTimer = 0;

function loadSession() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (isSession(stored)) return stored;
  } catch {
    // A malformed local save never blocks a fresh board.
  }
  return createSession();
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    showToast('Lokale Spielspur konnte in diesem Browser nicht gespeichert werden.');
  }
}

function activeState() {
  return session.boards[session.activeBoard];
}

function labelForSide(side) {
  return side === SIDES.WHITE ? 'WEISS' : 'SCHWARZ';
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.hidden = false;
  toastTimer = window.setTimeout(() => {
    toast.hidden = true;
  }, 3200);
}

function selectedPiece(state) {
  if (!selected || !state.board[selected] || state.board[selected].side !== state.turn) {
    selected = null;
    return null;
  }
  return state.board[selected];
}

function captionFor(state, piece, mission, game) {
  if (game.over) {
    return game.kind === 'checkmate'
      ? 'Spielende durch Schachmatt. Die vier Bretter bleiben als getrennte Spielspuren erhalten.'
      : 'Spielende durch Patt. Die Zugspur bleibt als Stellung erhalten.';
  }
  const who = labelForSide(state.turn);
  if (!piece) {
    const intro = view === 'position'
      ? 'P · Position'
      : view === 'function'
        ? 'F · Funktion'
        : view === 'history'
          ? 'H · Historie'
          : 'R · Relation';
    return intro + ': ' + who + ' am Zug. Wähle eine Figur; das Brett zeigt nur legale Kanten.';
  }
  if (view === 'position') {
    return 'P · ' + describePiece(piece) + ' auf ' + selected + '. ' + getLegalMoves(state, selected).length + ' legale Kanten.';
  }
  if (view === 'function') {
    return 'F · Bewegungsraum von ' + describePiece(piece) + '. Markiert sind die legalen nächsten Zustände.';
  }
  if (view === 'history') {
    return 'H · ' + describePiece(piece) + '. Pfad: ' + piece.history.join(' → ') + '.';
  }
  const attacked = getAttackedSquares(state, selected).length;
  return 'R · ' + describePiece(piece) + ' adressiert ' + attacked + ' Felder. Markiert sind die von dieser Figur erreichbaren Felder.';
}

function renderBoard(state, piece) {
  const legalMoves = piece ? getLegalMoves(state, selected) : [];
  const legalByTarget = new Map(legalMoves.map(move => [move.to, move]));
  const attacked = new Set(view === 'relation' && piece ? getAttackedSquares(state, selected) : []);
  const trail = new Set(view === 'history' && piece ? piece.history : []);
  const last = state.lastMove;

  boardElement.replaceChildren();
  for (let rank = 7; rank >= 0; rank -= 1) {
    for (let file = 0; file < 8; file += 1) {
      const at = 'abcdefgh'[file] + String(rank + 1);
      const current = state.board[at];
      const move = legalByTarget.get(at);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'square ' + ((file + rank) % 2 === 0 ? 'light' : 'dark');
      button.dataset.square = at;
      button.setAttribute('role', 'gridcell');
      button.setAttribute('aria-label', at + (current ? ', ' + describePiece(current) : ', leer'));

      if (at === selected) button.classList.add('selected');
      if (move) button.classList.add(move.kind === 'capture' || move.kind === 'en-passant' ? 'capture' : 'legal');
      if (last && at === last.from) button.classList.add('last-from');
      if (last && at === last.to) button.classList.add('last-to');
      if (attacked.has(at)) button.classList.add('relation');
      if (trail.has(at)) button.classList.add('history');
      if (view === 'function' && move) button.classList.add('function');

      if (current) {
        const icon = document.createElement('span');
        icon.className = 'piece ' + current.side + (current.promoted ? ' promoted' : '');
        icon.textContent = PIECE_GLYPHS[current.side][current.type];
        icon.setAttribute('aria-hidden', 'true');
        button.append(icon);
      }
      boardElement.append(button);
    }
  }
}

function renderControls(mission) {
  boardButtons.forEach(button => {
    const index = Number(button.dataset.board);
    const otherMission = getMissionStatus(session.boards[index]);
    const active = index === session.activeBoard;
    button.setAttribute('aria-selected', String(active));
    button.title = 'Brett ' + String(index + 1) + ' · ' + String(otherMission.transformed) + '/16';
    button.setAttribute('aria-label', 'Brett ' + String(index + 1) + ', ' + String(otherMission.transformed) + ' von 16 transformiert');
  });
  viewButtons.forEach(button => button.setAttribute('aria-selected', String(button.dataset.view === view)));
  missionOutput.textContent = mission.complete
    ? '16 / 16 · VERIFIZIERT'
    : String(mission.transformed) + ' / 16';
}

function render() {
  const state = activeState();
  const game = getGameStatus(state);
  const mission = getMissionStatus(state);
  const piece = selectedPiece(state);
  renderBoard(state, piece);
  renderControls(mission);
  turnOutput.textContent = game.over
    ? game.kind === 'checkmate' ? 'MATT' : 'PATT'
    : labelForSide(state.turn) + (game.inCheck ? ' · SCHACH' : '');
  anchorOutput.textContent = String(mission.anchorsAlive) + ' / ' + String(mission.anchorsTotal);
  moveOutput.textContent = String(state.history.length) + (state.history.length === 1 ? ' ZUG' : ' ZÜGE');
  viewCaption.textContent = captionFor(state, piece, mission, game);
}

function chooseSquare(at) {
  const state = activeState();
  const game = getGameStatus(state);
  if (game.over) {
    showToast('Diese Spielspur ist beendet. Wechsle zu einem anderen Brett oder setze sie neu.');
    return;
  }
  const current = state.board[at];
  if (selected) {
    const move = getLegalMoves(state, selected).find(candidate => candidate.to === at);
    if (move) {
      session.boards[session.activeBoard] = applyMove(state, move);
      selected = null;
      persist();
      render();
      return;
    }
  }
  selected = current && current.side === state.turn ? at : null;
  render();
}

boardElement.addEventListener('click', event => {
  const squareButton = event.target.closest('[data-square]');
  if (squareButton) chooseSquare(squareButton.dataset.square);
});

boardButtons.forEach(button => button.addEventListener('click', () => {
  session.activeBoard = Number(button.dataset.board);
  selected = null;
  replayStatus.textContent = '';
  persist();
  render();
}));

viewButtons.forEach(button => button.addEventListener('click', () => {
  view = button.dataset.view;
  render();
}));

resetButton.addEventListener('click', () => {
  session.boards[session.activeBoard] = createInitialState();
  selected = null;
  replayStatus.textContent = '';
  persist();
  render();
  showToast('Brett ' + String(session.activeBoard + 1) + ' steht wieder an der Pforte.');
});

detailsToggle.addEventListener('click', () => {
  const open = details.hidden;
  details.hidden = !open;
  detailsToggle.setAttribute('aria-expanded', String(open));
});

replayButton.addEventListener('click', () => {
  const result = replayMoveList(moveList.value);
  if (!result.moves.length) {
    replayStatus.textContent = 'Noch keine Zugadressen erkannt.';
    return;
  }
  if (!result.ok) {
    replayStatus.textContent = result.error;
    return;
  }
  session.boards[session.activeBoard] = result.state;
  selected = null;
  persist();
  render();
  replayStatus.textContent = result.mission.complete
    ? '16 / 16 · VERIFIZIERT'
    : 'Zugspur legal geladen · ' + String(result.mission.transformed) + ' / 16 transformiert.';
  showToast(result.mission.complete ? 'Die Lösungslinie ist maschinell bestätigt.' : 'Legale Zugspur auf Brett ' + String(session.activeBoard + 1) + ' geladen.');
});

render();
