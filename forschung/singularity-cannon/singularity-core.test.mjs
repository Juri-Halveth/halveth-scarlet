import test from 'node:test';
import assert from 'node:assert/strict';
import { beeinflusse_koerper_durch_singularitaet as step } from './singularity-core.mjs';

const field = { x: 100, y: 100, radius: 80, strength: 1, horizon: 12 };

test('outside radius leaves body unchanged', () => {
  const body = { x: 200, y: 100, vx: 0, vy: 0, mass: 1 };
  assert.deepEqual(step(body, field, 1 / 60), { beruehrt_vom_feld: false, horizonterreicht: false });
  assert.deepEqual(body, { x: 200, y: 100, vx: 0, vy: 0, mass: 1 });
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
});
