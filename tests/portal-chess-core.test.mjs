import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SIDES,
  applyMove,
  createInitialState,
  createSession,
  getLegalMoves,
  getMissionStatus,
  isSession,
  locatePiece,
  THREE_PAWN_TRACE,
  THREE_PAWN_TRACE_TEXT,
  replayMoveList
} from '../forschung/portal-chess/portal-chess-core.mjs';

test('portal opening keeps the swapped king and queen axis and all sixteen pawn identities', () => {
  const state = createInitialState();
  assert.equal(state.board.d1.type, 'king');
  assert.equal(state.board.e1.type, 'queen');
  assert.equal(state.board.d8.type, 'king');
  assert.equal(state.board.e8.type, 'queen');
  assert.equal(Object.values(state.registry).filter(piece => piece.originType === 'pawn').length, 16);
  assert.equal(getLegalMoves(state).length, 20);
});

test('a pawn carries its original identity through legal promotion', () => {
  const initial = createInitialState();
  const pawn = { ...initial.board.a2, hasMoved: true, history: ['a2', 'a7'] };
  const state = {
    ...initial,
    board: {
      d1: { ...initial.board.d1, history: ['d1'] },
      d8: { ...initial.board.d8, history: ['d8'] },
      a7: pawn
    },
    turn: SIDES.WHITE
  };
  const next = applyMove(state, { from: 'a7', to: 'a8' });
  assert.equal(next.board.a8.id, 'white-pawn-a');
  assert.equal(next.board.a8.originType, 'pawn');
  assert.equal(next.board.a8.type, 'queen');
  assert.equal(next.board.a8.promoted, true);
  assert.equal(getMissionStatus(next).transformed, 1);
});

test('portal castling uses the swapped d/e king axis only after its corridor clears', () => {
  const state = createInitialState();
  delete state.board.e1;
  delete state.board.f1;
  const castle = getLegalMoves(state, 'd1').find(move => move.kind === 'castle' && move.to === 'f1');
  assert.ok(castle);
  const next = applyMove(state, { from: 'd1', to: 'f1' });
  assert.equal(next.board.f1.type, 'king');
  assert.equal(next.board.e1.type, 'rook');
  assert.equal(next.board.h1, undefined);
});

test('a blocked rook has no fabricated line through its own pawn', () => {
  const state = createInitialState();
  assert.equal(getLegalMoves(state, 'a1').length, 0);
});

test('replay accepts a legal trace and refuses an illegal one without inventing a result', () => {
  const legal = replayMoveList('e2-e4 e7-e5 g1-f3');
  assert.equal(legal.ok, true);
  assert.equal(legal.state.history.length, 3);
  const invalid = replayMoveList('e2-e5');
  assert.equal(invalid.ok, false);
  assert.match(invalid.error, /Zug 1/);
});

test('the replayable three-pawn portal milestone keeps four original anchors alive', () => {
  const result = replayMoveList(THREE_PAWN_TRACE);
  assert.equal(result.ok, true);
  assert.equal(result.moves.length, 41);
  assert.equal(result.mission.transformed, 3);
  assert.equal(result.mission.lost, 2);
  assert.equal(result.mission.anchorsAlive, 4);
  assert.equal(result.mission.threePawns, true);
  assert.equal(result.mission.complete, false);
  assert.equal(result.status.over, false);
  assert.equal(locatePiece(result.state, 'white-pawn-a')?.[0], 'a8');
  assert.equal(locatePiece(result.state, 'black-pawn-h')?.[0], 'h1');
  assert.equal(locatePiece(result.state, 'white-pawn-c')?.[0], 'c8');

  const broken = replayMoveList(THREE_PAWN_TRACE_TEXT.replace('b2-b4', 'b2-b5'));
  assert.equal(broken.ok, false);
  assert.match(broken.error, /Zug 1/);
});

test('four board sessions remain explicit and serializable', () => {
  const session = createSession();
  assert.equal(session.boards.length, 4);
  assert.equal(isSession(JSON.parse(JSON.stringify(session))), true);
  assert.equal(isSession({ ...session, boards: session.boards.slice(0, 3) }), false);
});
