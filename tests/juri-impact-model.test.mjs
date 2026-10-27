import test from 'node:test';
import assert from 'node:assert/strict';
import {cases, summarizeBudget} from '../forschung/juri-thesis/wirkungswege-model.mjs';

test('all four modeled budgets retain both allocated and explicitly open amounts', () => {
  assert.equal(Object.keys(cases).length, 4);
  for (const entry of Object.values(cases)) {
    assert.ok(Number.isSafeInteger(entry.budget) && entry.budget > 0);
    assert.ok(entry.lines.every(line => Number.isSafeInteger(line.amount) && line.amount >= 0));
    const result = summarizeBudget(entry);
    assert.equal(result.allocated + result.unallocated, entry.budget, entry.title);
    assert.equal(result.unallocated, entry.lines.filter(line => line.allocated === false).reduce((sum, line) => sum + line.amount, 0), entry.title);
  }
});

test('the Bruehl gross payment claim has an exact ledger and no GDP conversion', () => {
  const result = summarizeBudget(cases.initiator);
  assert.equal(cases.initiator.budget, 2_000_000);
  assert.equal(result.localPayments, 1_000_000);
  assert.equal(cases.initiator.lines.filter(line => line.local).length, 5);
  assert.match(cases.initiator.ledgerNote, /Wertschöpfung.*separat/);
});
