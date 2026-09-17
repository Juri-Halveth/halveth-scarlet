const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const dir = path.join(root, 'forschung', 'de-debbi-hela');
const page = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
const publicText = fs.readFileSync(path.join(dir, 'public-monologue.md'), 'utf8');
const sources = JSON.parse(fs.readFileSync(path.join(dir, 'sources.json'), 'utf8'));
const address = '0x6416FDCfe74978Be4787A4e65E53090A7C9Eb5ca';

test('DE to DEBBI is an explicit fictional continuation with bilingual public context', () => {
  assert.match(page, /DE <span aria-hidden="true">→<\/span> DEBBI/);
  assert.match(page, /DEBBI erscheint auf dieser Seite als fiktionale Erzählstimme/);
  assert.match(page, /DEBBI appears on this page as a fictional narrative voice/);
  assert.match(page, /USER-DIRECTED EDITORIAL DERIVATIVE/);
  assert.match(page, /NO CANON CLAIM/);
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
