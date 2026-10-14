const { test } = require('node:test');
const assert = require('node:assert/strict');

test('30-person reference case separates invoices, value added and pension', async () => {
  const { calculate, scenarios } = await import('../forschung/juri-thesis/wirtschaftslabor-model.mjs');
  const result = calculate(scenarios.prueffall);
  assert.equal(result.budget, 1080000);
  assert.equal(result.localInvoices, 450000);
  assert.equal(result.t6Gva, 66937.5);
  assert.equal(result.postGva, 64260);
  assert.equal(result.t12Gva, 131197.5);
  assert.equal(result.pensionT12, 16740);
});

test('large request replaces one place and excludes the existing asset from GVA', async () => {
  const { calculate, scenarios } = await import('../forschung/juri-thesis/wirtschaftslabor-model.mjs');
  const result = calculate(scenarios.prueffall, { exceptional: true });
  assert.equal(result.budget, 3050000);
  assert.equal(result.localInvoices, 1435000);
  assert.equal(result.eligibleInvoices, 985000);
  assert.equal(result.t6Gva, 146518.75);
  assert.equal(result.t12Gva, 210778.75);
});

test('published scenario table and billion threshold stay in sync', async () => {
  const { calculate, scenarios } = await import('../forschung/juri-thesis/wirtschaftslabor-model.mjs');
  const cautious = calculate(scenarios.vorsichtig);
  const opportunity = calculate(scenarios.chancenfall);
  assert.equal(cautious.t6Gva, 13230);
  assert.equal(cautious.t12Gva, 24780);
  assert.equal(opportunity.t6Gva, 221130);
  assert.equal(opportunity.t12Gva, 447930);
  assert.equal(calculate(scenarios.prueffall).billionPilotCount, 7623);
  assert.equal(opportunity.billionPilotCount, 2233);
});

test('model rejects invalid fractions and impossible work months', async () => {
  const { calculate, scenarios } = await import('../forschung/juri-thesis/wirtschaftslabor-model.mjs');
  assert.throws(() => calculate({ ...scenarios.prueffall, additionalDemand: 1.2 }), RangeError);
  assert.throws(() => calculate({ ...scenarios.prueffall, workAfter: 181 }), RangeError);
});

test('zero additional value does not produce an infinite pilot count', async () => {
  const { calculate, scenarios } = await import('../forschung/juri-thesis/wirtschaftslabor-model.mjs');
  const result = calculate({ ...scenarios.prueffall, additionalDemand: 0, workAfter: 0 });
  assert.equal(result.t12Gva, 0);
  assert.equal(result.billionPilotCount, null);
});
