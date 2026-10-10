import test from 'node:test'
import assert from 'node:assert/strict'
import { zoomFromUnit, unitFromZoom, smoothToward } from './viewer.js'

test('zoom maps the full interval continuously and invertibly', () => {
  assert.equal(zoomFromUnit(0), 1)
  assert.ok(Math.abs(zoomFromUnit(1) - 16) < 1e-12)
  let previous = 0
  for (let i = 0; i <= 100; i++) {
    const u = i / 100
    const z = zoomFromUnit(u)
    assert.ok(z >= previous)
    assert.ok(Math.abs(unitFromZoom(z) - u) < 1e-12)
    previous = z
  }
})

test('time based easing advances without an endpoint jump', () => {
  let value = 1
  for (let i = 0; i < 120; i++) {
    const next = smoothToward(value, 16, 1000 / 120)
    assert.ok(next > value && next < 16)
    value = next
  }
  assert.ok(value < 16 && value > 1)
})
