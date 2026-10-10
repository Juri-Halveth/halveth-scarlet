import test from 'node:test'
import assert from 'node:assert/strict'
import { zoomFromUnit, unitFromZoom, smoothToward, frameCadence } from './viewer.js'

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

test('FPS summary requires actual increasing frame samples', () => {
  assert.equal(frameCadence([]), null)
  assert.equal(frameCadence([500]), null)
  assert.equal(frameCadence([500, 500]), null)
  assert.equal(frameCadence([500, 499]), null)
  const frames = Array.from({length: 181}, (_, i) => i * (1000 / 60))
  const result = frameCadence(frames)
  assert.ok(Math.abs(result.fps - 60) < 1e-9)
  assert.ok(Math.abs(result.p95Ms - 1000 / 60) < 1e-9)
  assert.equal(result.longPauseCount, 0)
  assert.equal(result.frameCount, 181)
  const interrupted = frameCadence([0, 16, 32, 1033, 1050])
  assert.equal(interrupted.longPauseCount, 1)
  assert.ok(interrupted.p95Ms >= 1000)
})
