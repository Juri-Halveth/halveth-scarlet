import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { THREE as T } from '../assets/entity-vendor/runtime.mjs';
import { createWorldGifts } from '../assets/entity-world-gifts.mjs';
const gift = (n, item = 'chocolate') => ({ kind: 'GIFT_DEMO', id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`, item });

test('three recognizable prop types have finite geometry and deterministic positions', () => {
  const a = createWorldGifts(T), b = createWorldGifts(T);
  try {
    for (const [i, item] of ['chocolate', 'book', 'beacon'].entries()) {
      const event = Object.freeze(gift(i, item));
      const first = a.add(event, 10), second = b.add(event, 10);
      assert.deepEqual(first.position.toArray(), second.position.toArray());
      assert.ok(first.position.length() >= 4 && first.position.length() <= 12);
      first.position.set(999, 999, 999);
      assert.notEqual(a.group.children[i].position.x, 999);
      const prop = a.group.children[i].children[0];
      assert.equal(prop.name, `gift-${item}`);
      assert.equal(prop.children.length, 5);
      prop.traverse(mesh => {
        if (!mesh.geometry) return;
        assert.ok([...mesh.geometry.attributes.position.array].every(Number.isFinite));
      });
    }
    assert.equal(a.count, 3);
  } finally { a.dispose(); b.dispose(); }
});
test('pause, reduced motion and rewind sample the same explicit world time', () => {
  const gifts = createWorldGifts(T);
  try {
    gifts.add(gift(1), 10);
    const root = gifts.group.children[0], prop = root.children[0], ring = root.children[1];
    gifts.update(10.4);
    const pose = [...prop.position.toArray(), ...prop.scale.toArray(), ring.material.opacity];
    gifts.update(10.4);
    assert.deepEqual([...prop.position.toArray(), ...prop.scale.toArray(), ring.material.opacity], pose);
    gifts.update(9); assert.equal(root.visible, false);
    gifts.update(10, true); assert.equal(root.visible, true); assert.equal(prop.scale.x, 1); assert.equal(ring.visible, false);
    gifts.update(12); assert.equal(prop.scale.x, 1); assert.equal(ring.visible, false);
  } finally { gifts.dispose(); }
});
test('visible prop count stays bounded and evicted event IDs stay deduplicated', () => {
  const gifts = createWorldGifts(T);
  try {
    for (let i = 0; i < 30; i++) gifts.add(gift(i), i);
    assert.equal(gifts.count, 24); assert.equal(gifts.group.children.length, 24);
    assert.equal(gifts.add(gift(0), 40), null);
    assert.equal(gifts.add({ ...gift(40), kind: 'PAYMENT' }, 40), null);
    assert.equal(gifts.add(gift(40, 'unknown'), 40), null);
    assert.equal(gifts.add(gift(40), Infinity), null);
  } finally { gifts.dispose(); }
  assert.equal(gifts.count, 0); assert.equal(gifts.group.children.length, 0);
  assert.equal(gifts.add(gift(41), 41), null); gifts.dispose();
});
test('public studio declares preview, passive recipient and no payment integration', () => {
  const html = fs.readFileSync(new URL('../entities/index.html', import.meta.url), 'utf8');
  const js = fs.readFileSync(new URL('../assets/entity-world-studio.mjs', import.meta.url), 'utf8');
  for (const id of ['studio-toggle', 'studio-create', 'studio-message', 'studio-stage-exit', 'studio-recipient']) assert.ok(html.includes(`id="${id}"`));
  assert.match(html, /Zahlungen inaktiv/);
  assert.match(html, /Vorschau auf diesem Gerät/);
  assert.doesNotMatch(js, /eth_sendTransaction|personal_sign|eth_signTypedData|innerHTML/);
  assert.match(js, /paymentState: 'NOT_A_PAYMENT'/);
});
