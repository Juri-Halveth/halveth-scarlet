import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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

test('property locality is an explicit seller assumption in model and initial HTML', () => {
  const entry = cases.initiator;
  const property = entry.lines.find(line => line.amount === 450000);
  assert.equal(property.local, true);
  assert.match(property.label, /Annahme: Verkäufer in Brühl/);
  assert.match(entry.action, /Annahme eines Verkäufers mit Standort in Brühl/);
  assert.match(entry.ledgerNote, /Modellannahme/);
  assert.match(entry.ledgerNote, /Lage der Wohnung.*Verkäuferstandort nicht/);
  const html = readFileSync(new URL('../forschung/juri-thesis/wirkungswege.html', import.meta.url), 'utf8');
  for (const value of [property.label, entry.action, entry.ledgerNote]) assert.ok(html.includes(value), 'initial HTML must disclose the same assumption');
});

test('an external seller reduces only the illustrative local payment total', () => {
  const counter = structuredClone(cases.initiator);
  counter.lines.find(line => line.amount === 450000).local = false;
  const healthy = summarizeBudget(cases.initiator);
  const externalSeller = summarizeBudget(counter);
  assert.equal(healthy.localPayments, 1000000);
  assert.equal(externalSeller.localPayments, 550000);
  assert.equal(externalSeller.allocated, healthy.allocated);
  assert.equal(externalSeller.unallocated, healthy.unallocated);
  assert.equal(counter.budget, cases.initiator.budget);
  assert.equal(cases.initiator.lines.find(line => line.amount === 450000).local, true);
});

test('utility capacity wording requires a baseline and additional-capacity evidence', () => {
  const html = readFileSync(new URL('../forschung/juri-thesis/bruehl-atlas.html', import.meta.url), 'utf8');
  const heading = html.indexOf('<h3>Kaufmännisch in die Versorgung</h3>');
  assert.ok(heading >= 0);
  const card = html.slice(heading, html.indexOf('</article>', heading));
  assert.doesNotMatch(card, /unbesetzt oder anders besetzt/);
  assert.match(card, /ausdrücklich beschriebenen Ohne-Pilot-Vergleich/);
  assert.match(card, /Belege, welche Kapazität im selben Zeitraum tatsächlich zusätzlich entsteht/);
  assert.match(card, /anderen Person belegt keine zusätzliche Kapazität/);
});
