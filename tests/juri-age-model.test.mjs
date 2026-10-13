import test from 'node:test';
import assert from 'node:assert/strict';
import { ageWeight, chartPoints, svg } from '../tools/juri_age_model.mjs';

test('16 distinct points cover ages 18 through 65 and reverse the old 1-to-2 slope', () => {
  const points = chartPoints();
  assert.equal(points.length, 16);
  assert.equal(points[0].age, 18);
  assert.equal(points.at(-1).age, 65);
  assert.equal(points[0].weight, 2);
  assert.equal(points.at(-1).weight, 1);
  assert.equal(new Set(points.map(point => point.age)).size, 16);
  for (let index = 1; index < points.length; index++) {
    assert.ok(points[index].age > points[index - 1].age);
    assert.ok(points[index].weight < points[index - 1].weight);
  }
  for (let age = 18; age <= 65; age++) {
    const oldWeight = 1 + (age - 18) / 47;
    assert.ok(Math.abs(ageWeight(age) - (3 - oldWeight)) < 1e-12);
    assert.ok(ageWeight(age) >= 1);
  }
  assert.equal(ageWeight(66), 1);
  assert.equal(ageWeight(100), 1);
  assert.throws(() => ageWeight(17), RangeError);
});

test('the public vector chart includes every declared support point', () => {
  const chart = svg();
  assert.match(chart, /Keine echte Bewerbungsentscheidung/);
  assert.equal((chart.match(/<circle /g) ?? []).length, 16);
});
