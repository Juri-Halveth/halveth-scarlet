export const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
export const SIDES = Object.freeze({ WHITE: 'white', BLACK: 'black' });
export const PIECE_GLYPHS = Object.freeze({
  white: { pawn: '♙', knight: '♘', bishop: '♗', rook: '♖', queen: '♕', king: '♔' },
  black: { pawn: '♟', knight: '♞', bishop: '♝', rook: '♜', queen: '♛', king: '♚' }
});

// A replayable local milestone. It promotes the original a2, h7 and c2 pawns,
// leaves all four original king/queen anchors on the board, and remains an
// active position after the final move. It deliberately is not a 16/16 claim.
export const THREE_PAWN_TRACE = Object.freeze([
  { from: 'b2', to: 'b4' }, { from: 'g7', to: 'g6' },
  { from: 'b4', to: 'b5' }, { from: 'g6', to: 'g5' },
  { from: 'b5', to: 'b6' }, { from: 'a7', to: 'b6' },
  { from: 'a2', to: 'a4' }, { from: 'b8', to: 'c6' },
  { from: 'a4', to: 'a5' }, { from: 'a8', to: 'b8' },
  { from: 'a5', to: 'a6' }, { from: 'g8', to: 'f6' },
  { from: 'a6', to: 'a7' }, { from: 'f6', to: 'g8' },
  { from: 'a7', to: 'a8' }, { from: 'g5', to: 'g4' },
  { from: 'g1', to: 'f3' }, { from: 'g4', to: 'g3' },
  { from: 'h2', to: 'g3' }, { from: 'h7', to: 'h5' },
  { from: 'h1', to: 'g1' }, { from: 'h5', to: 'h4' },
  { from: 'b1', to: 'a3' }, { from: 'h4', to: 'h3' },
  { from: 'a3', to: 'b1' }, { from: 'h3', to: 'h2' },
  { from: 'b1', to: 'a3' }, { from: 'h2', to: 'h1' },
  { from: 'a3', to: 'b5' }, { from: 'd7', to: 'd5' },
  { from: 'b5', to: 'd6' }, { from: 'c7', to: 'd6' },
  { from: 'c2', to: 'c4' }, { from: 'c8', to: 'd7' },
  { from: 'c4', to: 'c5' }, { from: 'c6', to: 'e5' },
  { from: 'c5', to: 'c6' }, { from: 'e7', to: 'e6' },
  { from: 'c6', to: 'c7' }, { from: 'd8', to: 'e7' },
  { from: 'c7', to: 'c8' }
]);
export const THREE_PAWN_TRACE_TEXT = THREE_PAWN_TRACE.map(move => move.from + '-' + move.to).join(' ');

const BACK_RANK = ['rook', 'knight', 'bishop', 'king', 'queen', 'bishop', 'knight', 'rook'];
const PIECE_NAMES = {
  pawn: 'Bauer',
  knight: 'Springer',
  bishop: 'Läufer',
  rook: 'Turm',
  queen: 'Dame',
  king: 'König'
};

export const opposite = side => side === SIDES.WHITE ? SIDES.BLACK : SIDES.WHITE;
export const square = (fileIndex, rankIndex) => FILES[fileIndex] + String(rankIndex + 1);
export const point = value => ({ file: FILES.indexOf(value[0]), rank: Number(value[1]) - 1 });
export const inBounds = (file, rank) => file >= 0 && file < 8 && rank >= 0 && rank < 8;
export const isSquare = value => typeof value === 'string' && /^[a-h][1-8]$/.test(value);

function clonePiece(piece) {
  return { ...piece, history: [...piece.history] };
}

function cloneState(state) {
  return {
    ...state,
    board: Object.fromEntries(Object.entries(state.board).map(([key, piece]) => [key, clonePiece(piece)])),
    capturedIds: [...state.capturedIds],
    history: state.history.map(move => ({ ...move })),
    enPassant: state.enPassant ? { ...state.enPassant } : null,
    registry: state.registry
  };
}

function makePiece(side, type, from) {
  const file = from[0];
  const id = type === 'pawn'
    ? side + '-pawn-' + file
    : side + '-' + type + '-original';
  return {
    id,
    side,
    type,
    originType: type,
    originSquare: from,
    promoted: false,
    hasMoved: false,
    history: [from]
  };
}

export function createInitialState() {
  const board = {};
  const registry = {};
  const put = (side, type, at) => {
    const piece = makePiece(side, type, at);
    board[at] = piece;
    registry[piece.id] = {
      id: piece.id,
      side,
      originType: type,
      originSquare: at
    };
  };

  BACK_RANK.forEach((type, index) => {
    put(SIDES.WHITE, type, square(index, 0));
    put(SIDES.BLACK, type, square(index, 7));
    put(SIDES.WHITE, 'pawn', square(index, 1));
    put(SIDES.BLACK, 'pawn', square(index, 6));
  });

  return {
    schema: 'halveth.portal-chess.state.v1',
    turn: SIDES.WHITE,
    ply: 0,
    board,
    registry,
    capturedIds: [],
    history: [],
    enPassant: null,
    lastMove: null
  };
}

export function createSession() {
  return {
    schema: 'halveth.portal-chess.session.v1',
    activeBoard: 0,
    boards: Array.from({ length: 4 }, () => createInitialState())
  };
}

export function isSession(value) {
  return Boolean(
    value &&
    value.schema === 'halveth.portal-chess.session.v1' &&
    Number.isInteger(value.activeBoard) &&
    value.activeBoard >= 0 &&
    value.activeBoard < 4 &&
    Array.isArray(value.boards) &&
    value.boards.length === 4 &&
    value.boards.every(state => state && state.schema === 'halveth.portal-chess.state.v1' && state.board && state.registry)
  );
}

export function entriesForSide(state, side) {
  return Object.entries(state.board).filter(([, piece]) => piece.side === side);
}

export function locatePiece(state, id) {
  return Object.entries(state.board).find(([, piece]) => piece.id === id) || null;
}

export function findKing(state, side) {
  return Object.entries(state.board).find(([, piece]) => piece.side === side && piece.type === 'king') || null;
}

function addTarget(state, piece, from, to, moves, kind = 'move') {
  const target = state.board[to];
  if (!target) {
    moves.push({ from, to, kind });
  } else if (target.side !== piece.side && target.type !== 'king') {
    moves.push({ from, to, kind: 'capture' });
  }
}

function addRayMoves(state, piece, from, vectors, moves) {
  const start = point(from);
  for (const [dx, dy] of vectors) {
    let file = start.file + dx;
    let rank = start.rank + dy;
    while (inBounds(file, rank)) {
      const to = square(file, rank);
      const target = state.board[to];
      if (!target) {
        moves.push({ from, to, kind: 'move' });
      } else {
        if (target.side !== piece.side && target.type !== 'king') {
          moves.push({ from, to, kind: 'capture' });
        }
        break;
      }
      file += dx;
      rank += dy;
    }
  }
}

function addPortalCastles(state, piece, from, moves) {
  if (piece.originType !== 'king' || piece.hasMoved) return;
  const home = piece.side === SIDES.WHITE ? 'd1' : 'd8';
  if (from !== home) return;
  const rank = from[1];
  const possibilities = [
    { rookFrom: 'a' + rank, kingTo: 'b' + rank, rookTo: 'c' + rank, between: ['b' + rank, 'c' + rank], side: 'left' },
    { rookFrom: 'h' + rank, kingTo: 'f' + rank, rookTo: 'e' + rank, between: ['e' + rank, 'f' + rank], side: 'right' }
  ];
  for (const candidate of possibilities) {
    const rook = state.board[candidate.rookFrom];
    if (!rook || rook.side !== piece.side || rook.originType !== 'rook' || rook.hasMoved) continue;
    if (candidate.between.some(at => state.board[at])) continue;
    moves.push({
      from,
      to: candidate.kingTo,
      kind: 'castle',
      rookFrom: candidate.rookFrom,
      rookTo: candidate.rookTo,
      castleSide: candidate.side
    });
  }
}

export function getPseudoLegalMoves(state, from) {
  const piece = state.board[from];
  if (!piece || !isSquare(from)) return [];
  const moves = [];
  const here = point(from);

  if (piece.type === 'pawn') {
    const direction = piece.side === SIDES.WHITE ? 1 : -1;
    const startingRank = piece.side === SIDES.WHITE ? 1 : 6;
    const oneRank = here.rank + direction;
    if (inBounds(here.file, oneRank)) {
      const one = square(here.file, oneRank);
      if (!state.board[one]) {
        moves.push({ from, to: one, kind: 'move' });
        const twoRank = here.rank + (direction * 2);
        if (here.rank === startingRank && inBounds(here.file, twoRank)) {
          const two = square(here.file, twoRank);
          if (!state.board[two]) moves.push({ from, to: two, kind: 'pawn-double' });
        }
      }
      for (const dx of [-1, 1]) {
        const file = here.file + dx;
        if (!inBounds(file, oneRank)) continue;
        const to = square(file, oneRank);
        const target = state.board[to];
        if (target && target.side !== piece.side && target.type !== 'king') {
          moves.push({ from, to, kind: 'capture' });
        } else if (
          state.enPassant &&
          state.enPassant.target === to &&
          state.enPassant.availableTo === piece.side &&
          state.board[state.enPassant.pawnSquare] &&
          state.board[state.enPassant.pawnSquare].side !== piece.side
        ) {
          moves.push({
            from,
            to,
            kind: 'en-passant',
            captureSquare: state.enPassant.pawnSquare
          });
        }
      }
    }
    return moves;
  }

  if (piece.type === 'knight') {
    for (const [dx, dy] of [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]]) {
      const file = here.file + dx;
      const rank = here.rank + dy;
      if (inBounds(file, rank)) addTarget(state, piece, from, square(file, rank), moves);
    }
    return moves;
  }

  if (piece.type === 'bishop' || piece.type === 'rook' || piece.type === 'queen') {
    const diagonal = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
    const straight = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    const vectors = piece.type === 'bishop' ? diagonal : piece.type === 'rook' ? straight : diagonal.concat(straight);
    addRayMoves(state, piece, from, vectors, moves);
    return moves;
  }

  if (piece.type === 'king') {
    for (const dx of [-1, 0, 1]) {
      for (const dy of [-1, 0, 1]) {
        if (dx === 0 && dy === 0) continue;
        const file = here.file + dx;
        const rank = here.rank + dy;
        if (inBounds(file, rank)) addTarget(state, piece, from, square(file, rank), moves);
      }
    }
    addPortalCastles(state, piece, from, moves);
  }

  return moves;
}

export function getAttackedSquares(state, from) {
  const piece = state.board[from];
  if (!piece) return [];
  const here = point(from);
  const targets = [];
  const add = (file, rank) => {
    if (inBounds(file, rank)) targets.push(square(file, rank));
  };

  if (piece.type === 'pawn') {
    const direction = piece.side === SIDES.WHITE ? 1 : -1;
    add(here.file - 1, here.rank + direction);
    add(here.file + 1, here.rank + direction);
    return targets;
  }
  if (piece.type === 'knight') {
    [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]]
      .forEach(([dx, dy]) => add(here.file + dx, here.rank + dy));
    return targets;
  }
  if (piece.type === 'king') {
    for (const dx of [-1, 0, 1]) {
      for (const dy of [-1, 0, 1]) {
        if (dx || dy) add(here.file + dx, here.rank + dy);
      }
    }
    return targets;
  }
  const diagonal = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  const straight = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const vectors = piece.type === 'bishop' ? diagonal : piece.type === 'rook' ? straight : diagonal.concat(straight);
  for (const [dx, dy] of vectors) {
    let file = here.file + dx;
    let rank = here.rank + dy;
    while (inBounds(file, rank)) {
      const to = square(file, rank);
      targets.push(to);
      if (state.board[to]) break;
      file += dx;
      rank += dy;
    }
  }
  return targets;
}

export function isSquareAttacked(state, at, bySide) {
  return entriesForSide(state, bySide).some(([from]) => getAttackedSquares(state, from).includes(at));
}

export function isInCheck(state, side) {
  const king = findKing(state, side);
  if (!king) return true;
  return isSquareAttacked(state, king[0], opposite(side));
}

function castlePathSafe(state, move, side) {
  const from = point(move.from);
  const to = point(move.to);
  const step = to.file > from.file ? 1 : -1;
  for (let file = from.file; file !== to.file + step; file += step) {
    if (isSquareAttacked(state, square(file, from.rank), opposite(side))) return false;
  }
  return true;
}

function applyMoveUnchecked(state, move) {
  const next = cloneState(state);
  const piece = next.board[move.from];
  if (!piece) throw new Error('Missing piece at ' + move.from);
  let captured = null;
  if (move.kind === 'en-passant') {
    captured = next.board[move.captureSquare] || null;
    delete next.board[move.captureSquare];
  } else if (next.board[move.to]) {
    captured = next.board[move.to];
    delete next.board[move.to];
  }
  if (captured) next.capturedIds.push(captured.id);

  delete next.board[move.from];
  piece.hasMoved = true;
  piece.history.push(move.to);
  let promotion = null;
  if (piece.type === 'pawn' && (move.to[1] === '8' || move.to[1] === '1')) {
    piece.type = 'queen';
    piece.promoted = true;
    promotion = 'queen';
  }
  next.board[move.to] = piece;

  if (move.kind === 'castle') {
    const rook = next.board[move.rookFrom];
    if (!rook) throw new Error('Missing portal rook at ' + move.rookFrom);
    delete next.board[move.rookFrom];
    rook.hasMoved = true;
    rook.history.push(move.rookTo);
    next.board[move.rookTo] = rook;
  }

  next.enPassant = null;
  if (move.kind === 'pawn-double') {
    const origin = point(move.from);
    const destination = point(move.to);
    next.enPassant = {
      target: square(origin.file, (origin.rank + destination.rank) / 2),
      pawnSquare: move.to,
      availableTo: opposite(piece.side)
    };
  }

  next.ply = state.ply + 1;
  next.turn = opposite(state.turn);
  const record = {
    ply: next.ply,
    side: piece.side,
    pieceId: piece.id,
    from: move.from,
    to: move.to,
    kind: move.kind,
    capturedId: captured ? captured.id : null,
    promotion
  };
  next.history.push(record);
  next.lastMove = record;
  return next;
}

export function getLegalMoves(state, from = null) {
  const sources = from
    ? state.board[from] && state.board[from].side === state.turn ? [[from, state.board[from]]] : []
    : entriesForSide(state, state.turn);
  const moves = [];
  for (const [origin, piece] of sources) {
    for (const move of getPseudoLegalMoves(state, origin)) {
      if (move.kind === 'castle' && !castlePathSafe(state, move, piece.side)) continue;
      const candidate = applyMoveUnchecked(state, move);
      if (!isInCheck(candidate, piece.side)) moves.push(move);
    }
  }
  return moves;
}

export function applyMove(state, requested) {
  if (!requested || !isSquare(requested.from) || !isSquare(requested.to)) throw new Error('Invalid move address');
  const legal = getLegalMoves(state, requested.from).find(move => move.to === requested.to);
  if (!legal) throw new Error('Move is not legal in the current portal position');
  return applyMoveUnchecked(state, legal);
}

export function getMissionStatus(state) {
  const originalPawns = Object.values(state.registry).filter(piece => piece.originType === 'pawn');
  const anchors = [
    SIDES.WHITE + '-king-original',
    SIDES.WHITE + '-queen-original',
    SIDES.BLACK + '-king-original',
    SIDES.BLACK + '-queen-original'
  ];
  const liveIds = new Set(Object.values(state.board).map(piece => piece.id));
  const transformed = originalPawns.filter(pawn => {
    const found = locatePiece(state, pawn.id);
    return Boolean(found && found[1].promoted && found[1].type === 'queen');
  });
  const lost = originalPawns.filter(pawn => state.capturedIds.includes(pawn.id));
  const anchorsAlive = anchors.filter(id => liveIds.has(id));
  return {
    originalPawns: originalPawns.length,
    transformed: transformed.length,
    lost: lost.length,
    anchorsAlive: anchorsAlive.length,
    anchorsTotal: anchors.length,
    threePawns: transformed.length >= 3 && anchorsAlive.length === anchors.length,
    complete: transformed.length === originalPawns.length && lost.length === 0 && anchorsAlive.length === anchors.length,
    claim: '16/16 PORTAL CHALLENGE'
  };
}

export function getGameStatus(state) {
  const legalMoves = getLegalMoves(state);
  const inCheck = isInCheck(state, state.turn);
  if (!legalMoves.length) {
    return {
      kind: inCheck ? 'checkmate' : 'stalemate',
      over: true,
      inCheck,
      legalMoves: 0
    };
  }
  return {
    kind: inCheck ? 'check' : 'active',
    over: false,
    inCheck,
    legalMoves: legalMoves.length
  };
}

export function describePiece(piece) {
  if (!piece) return '';
  const prefix = piece.side === SIDES.WHITE ? 'Weiß' : 'Schwarz';
  const origin = piece.originType === 'pawn'
    ? ' · Ursprung ' + piece.originSquare + (piece.promoted ? ' · transformiert' : '')
    : ' · Originalanker';
  return prefix + ' · ' + PIECE_NAMES[piece.type] + origin;
}

export function formatMove(state, record) {
  const piece = Object.values(state.registry).find(item => item.id === record.pieceId);
  const type = record.promotion ? 'Bauer → Dame' : piece ? PIECE_NAMES[piece.originType] : 'Figur';
  return String(record.ply) + '. ' + type + ' ' + record.from + ' → ' + record.to;
}

export function parseMoveList(input) {
  if (typeof input !== 'string') return [];
  const matches = input.toLowerCase().match(/[a-h][1-8]\s*(?:-|→|:|\s)?\s*[a-h][1-8]/g) || [];
  return matches.map(token => {
    const compact = token.replace(/[^a-h1-8]/g, '');
    return { from: compact.slice(0, 2), to: compact.slice(2, 4) };
  });
}

export function replayMoveList(input) {
  const moves = Array.isArray(input) ? input : parseMoveList(input);
  let state = createInitialState();
  for (let index = 0; index < moves.length; index += 1) {
    try {
      state = applyMove(state, moves[index]);
    } catch (error) {
      return { ok: false, state, moves, error: 'Zug ' + String(index + 1) + ': ' + error.message };
    }
  }
  return {
    ok: true,
    state,
    moves,
    mission: getMissionStatus(state),
    status: getGameStatus(state)
  };
}
