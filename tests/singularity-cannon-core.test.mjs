import test from 'node:test';
import assert from 'node:assert/strict';
import { beeinflusse_koerper_durch_singularitaet as step } from '../forschung/singularity-cannon/singularity-core.mjs';

const field = { x: 100, y: 100, radius: 80, strength: 1, horizon: 12 };

test('outside the reference radius still has a weaker, continuous pull', () => {
  const near = { x: 200, y: 100, vx: 0, vy: 0, mass: 1 };
  const far = { x: 400, y: 100, vx: 0, vy: 0, mass: 1 };
  const nearResult = step(near, field, 1 / 60);
  const farResult = step(far, field, 1 / 60);
  assert.equal(nearResult.beruehrt_vom_feld, true);
  assert.equal(farResult.beruehrt_vom_feld, true);
  assert.ok(nearResult.aktuelle_beschleunigung > farResult.aktuelle_beschleunigung);
  assert.ok(near.vx < far.vx && far.vx < 0);
});

test('inside field changes velocity and integrates position once', () => {
  const body = { x: 50, y: 100, vx: 0, vy: 0, mass: 1 };
  const dt = 1 / 60;
  const result = step(body, field, dt);
  assert.equal(result.beruehrt_vom_feld, true);
  assert.equal(result.horizonterreicht, false);
  assert.ok(body.vx > 0 && body.vy > 0);
  assert.ok(Math.abs(body.x - (50 + body.vx * dt)) < 1e-10);
  assert.ok(Math.abs(body.y - (100 + body.vy * dt)) < 1e-10);
});

test('horizon reports arrival without hidden movement', () => {
  const body = { x: 95, y: 100, vx: 3, vy: 4, mass: 1 };
  const before = { ...body };
  assert.equal(step(body, field, 1 / 60).horizonterreicht, true);
  assert.deepEqual(body, before);
});

test('invalid numerical contracts fail before mutating the body', () => {
  const body = { x: 50, y: 100, vx: 0, vy: 0, mass: 1 };
  const before = { ...body };
  assert.throws(() => step(body, field, -1), RangeError);
  assert.throws(() => step(body, { ...field, radius: 0 }, 1 / 60), RangeError);
  assert.throws(() => step(body, { ...field, strength: Number.NaN }, 1 / 60), RangeError);
  assert.deepEqual(body, before);
  const overflow = { x: 1e308, y: 100, vx: 1e308, vy: 0, mass: 1 };
  const overflowBefore = { ...overflow };
  assert.throws(() => step(overflow, field, 1e308), RangeError);
  assert.deepEqual(overflow, overflowBefore);
});
