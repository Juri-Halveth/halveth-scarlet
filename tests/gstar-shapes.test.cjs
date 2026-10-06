'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const shapes = require('../forschung/weltkeimwerk/live-shapes.js');
const epsilon = 1e-12;
const close = (a, b) => assert(Math.abs(a - b) <= epsilon, `${a} != ${b}`);

test('valid contours are finite, positively wound and inside the conservative unit circle', () => {
  for (const corners of [0, .1, .5, .92, 1]) for (const petal of [false, true]) for (const segments of [12, 13, 20, 32, 64]) {
    const points = shapes.contour(corners, petal, segments);
    assert.equal(points.length, segments);
    assert.equal(new Set(points.map(point => point.join(','))).size, segments, 'no repeated closing vertex');
    let twiceArea = 0;
    for (let i = 0; i < points.length; i++) {
      const point = points[i], next = points[(i + 1) % points.length];
      assert.equal(point.length, 2); assert(point.every(Number.isFinite));
      const radius = Math.hypot(...point);
      assert(radius > 0 && radius <= 1 + epsilon, 'every vertex lies in the conservative body');
      twiceArea += point[0] * next[1] - next[0] * point[1];
    }
    assert(twiceArea > 0, 'counterclockwise nondegenerate closed polygon');
    // The unit disk is convex, so the straight edges between these vertices also stay inside it.
  }
});

test('circular, square-like and petal parameters produce measurably distinct contours', () => {
  const circle = shapes.contour(0, false, 40), square = shapes.contour(1, false, 40), petal = shapes.contour(0, true, 40);
  assert(circle.every(point => Math.abs(Math.hypot(...point) - 1) <= epsilon));
  assert(square.every(([x, y]) => Math.abs(x) <= Math.SQRT1_2 + epsilon && Math.abs(y) <= Math.SQRT1_2 + epsilon));
  close(square[0][0], Math.SQRT1_2); close(square[5][0], Math.SQRT1_2); close(square[5][1], Math.SQRT1_2);
  const radii = petal.map(point => Math.hypot(...point));
  close(Math.max(...radii), 1); close(Math.min(...radii), .8);
  assert.notDeepEqual(circle, square); assert.notDeepEqual(circle, petal); assert.notDeepEqual(square, petal);
  const mixed = shapes.contour(.5, false, 40);
  assert.notDeepEqual(mixed, circle); assert.notDeepEqual(mixed, square);
});

test('explicit invalid contour inputs are rejected without silent coercion', () => {
  for (const corners of [-.01, 1.01, NaN, Infinity, -Infinity, null, '0', false, {}]) assert.throws(() => shapes.contour(corners, false, 32), TypeError);
  for (const petal of [0, 1, null, 'true', [], {}]) assert.throws(() => shapes.contour(0, petal, 32), TypeError);
  for (const segments of [0, 11, 65, 32.5, NaN, Infinity, null, '32', true]) assert.throws(() => shapes.contour(0, false, segments), TypeError);
});

test('contours are deterministic detached values and retain their documented defaults', () => {
  assert.deepEqual(shapes.contour(), shapes.contour(0, false, 32));
  const first = shapes.contour(.5, true, 32), original = shapes.contour(.5, true, 32);
  assert.deepEqual(first, original);
  first[0][0] = Infinity; first.push([100, 100]);
  assert.deepEqual(shapes.contour(.5, true, 32), original);
});

test('the live page defers scripts in dependency order: core, shapes, renderer', () => {
  const html = fs.readFileSync(path.join(__dirname, '../forschung/weltkeimwerk/index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi)]
    .map(match => ({ name: match[1].split('?')[0], tag: match[0] }));
  const names = ['live-core.js', 'live-shapes.js', 'live.js'];
  const relevant = scripts.filter(script => names.includes(script.name));
  assert.deepEqual(relevant.map(script => script.name), names, 'each dependency appears once in execution order');
  for (const script of relevant) {
    assert(/\sdefer(?:\s|=|>)/i.test(script.tag), `${script.name} is deferred`);
    assert(!/\sasync(?:\s|=|>)/i.test(script.tag), `${script.name} cannot execute out of order`);
  }
});
