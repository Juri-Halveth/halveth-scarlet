const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const dir = path.join(root, 'forschung', 'de-anker-hela');
const page = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
const publicText = fs.readFileSync(path.join(dir, 'public-monologue.md'), 'utf8');
const sources = JSON.parse(fs.readFileSync(path.join(dir, 'sources.json'), 'utf8'));
const address = '0x6416FDCfe74978Be4787A4e65E53090A7C9Eb5ca';

test('DE to CONTEXT-ANCHOR is a neutral public research ID with bilingual context', () => {
  assert.match(page, /DE <span aria-hidden="true">→<\/span> KONTEXT-ANKER/);
  assert.match(page, /KONTEXT-ANKER bezeichnet keine Person, sondern eine neutrale öffentliche Forschungs-ID für einen Erinnerungsanker/);
  assert.match(page, /CONTEXT-ANCHOR does not identify a person\. It is a neutral public research ID for a memory anchor/);
  assert.match(page, /DE_CODE · AUSGABE/);
  assert.match(page, /DE_CODE · OUTPUT/);
  assert.match(page, /USER-DIRECTED EDITORIAL DERIVATIVE/);
  assert.match(page, /MEMORY_ANCHOR_PROGRAM/);
  assert.equal(sources.claims.find(item => item.id === 'C02').state, 'USER_DEFINED_PROGRAM_CODE_MEMORY_ANCHOR');
});

test('public page excludes the private transcript and sensitive event context', () => {
  for (const forbidden of ['C:\\Users\\', '[19:', 'WhatsApp Image', 'Nummer ausgetauscht']) {
    assert.equal(page.includes(forbidden), false, forbidden);
    assert.equal(publicText.includes(forbidden), false, forbidden);
  }
  assert.equal(sources.privacy.privateRawPublished, false);
  assert.equal(sources.privacy.thirdPartyNamesPublished, false);
  assert.equal(sources.privacy.workplaceDetailsPublished, false);
  assert.equal(sources.privacy.privateContactDetailsPublished, false);

  const privateNameDigests = new Set([
    '1ecadae5576267c7bbbe348268037086fc17b98c81e43547a2aabe0802537a5c',
    '5e58e404ffb6595241a4fa4187fede8534612b0b4a12e5b08947c76edd473bdb',
    'eaa8cecdcddc1d1b8aa3670c0756f6104f5aaf9e3adefff8eb732e602ff03d84',
    'd84fe7e07bedb227cffff10009151d96fc944f6a1bd37cff60e8e4626a1eb1c3'
  ]);
  const crypto = require('node:crypto');
  const publicTokens = `${page}\n${publicText}`.toLocaleLowerCase('de-DE').match(/[\p{L}\p{N}_-]+/gu) || [];
  for (const token of publicTokens) {
    const digest = crypto.createHash('sha256').update(token).digest('hex');
    assert.equal(privateNameDigests.has(digest), false, 'a hash-bound private name marker reached the public text');
  }
});

test('support address stays passive and cannot trigger wallet behavior', () => {
  assert.match(address, /^0x[0-9a-fA-F]{40}$/);
  assert.equal(page.split(address).length - 1, 1);
  for (const active of ['eth_sendTransaction', 'eth_requestAccounts', 'ethereum.request', 'wallet_addEthereumChain', 'window.ethereum']) {
    assert.equal(page.includes(active), false, active);
  }
  assert.match(page, /verbindet keine Wallet/);
  assert.match(page, /connects no wallet/);
  assert.equal(sources.claims.find(item => item.id === 'C04').state, 'USER_DESIGNATED_ADDRESS_FORMAT_VALID_CONTROL_NOT_VERIFIED');
});

test('the public source artifact is byte-bound and rights stay separated', () => {
  const crypto = require('node:crypto');
  const bytes = fs.readFileSync(path.join(dir, sources.publicArtifact.path));
  assert.equal(bytes.length, sources.publicArtifact.bytes);
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), sources.publicArtifact.sha256);
  assert.match(page, /Keine offizielle Marvel-\/Disney-Veröffentlichung/);
  assert.match(page, /Not an official Marvel\/Disney publication/);
  assert.match(sources.claimCeiling, /NO_CANON_PHYSICAL_BIOLOGICAL/);
});

test('provenance correction prevents real-person and medical claims', () => {
  assert.equal(page.includes('fiktionale Erzählstimme'), false);
  assert.equal(page.includes('fictional narrative voice'), false);
  assert.match(page, /Die öffentliche Ausgabe enthält keine Namen privater Dritter und beansprucht keine Identität, Teilnahme, Zustimmung oder Vertretung/);
  assert.match(page, /The public edition omits private third-party names and makes no claim of identity, participation, consent, or representation/);
  assert.match(page, /keine Diagnose, Prognose, Präventions-, Behandlungs- oder Wirksamkeitsbehauptung/);
  assert.match(page, /not a diagnosis, prognosis, prevention, treatment, or efficacy claim/);
  assert.match(page, /keine Außenbeobachtung/);
  assert.match(page, /not an external observation/);
  assert.equal(sources.privacy.realPersonSpeechAttributed, false);
  assert.equal(sources.privacy.realPersonRepresentationClaimed, false);
  assert.equal(sources.privacy.medicalDiagnosisClaimed, false);
  assert.match(sources.claimCeiling, /NO_CANON_PHYSICAL_BIOLOGICAL_REAL_PERSON_SPEECH_AUTHORSHIP_CONSENT_REPRESENTATION_AUTONOMOUS_AGENT_COMPLETE_RECONSTRUCTION_MEDICAL/);
});
