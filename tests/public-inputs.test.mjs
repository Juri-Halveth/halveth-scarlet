import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { trackedSourceFiles, isTrackedPublicInput } from '../tools/public_inputs.mjs';

test('public input filter excludes ignored and untracked local files', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'scarlet-public-inputs-'));
  try {
    execFileSync('git', ['init', '-q'], { cwd: root });
    fs.writeFileSync(path.join(root, '.gitignore'), 'private.txt\n');
    const publicDir = path.join(root, 'forschung');
    fs.mkdirSync(publicDir);
    const tracked = path.join(publicDir, 'visible.txt');
    const ignored = path.join(publicDir, 'private.txt');
    const untracked = path.join(publicDir, 'scratch.txt');
    fs.writeFileSync(tracked, 'published');
    fs.writeFileSync(ignored, 'local secret');
    fs.writeFileSync(untracked, 'draft');
    execFileSync('git', ['add', '.gitignore', 'forschung/visible.txt'], { cwd: root });
    const index = trackedSourceFiles(root);
    assert.equal(isTrackedPublicInput(publicDir, index), true);
    assert.equal(isTrackedPublicInput(tracked, index), true);
    assert.equal(isTrackedPublicInput(ignored, index), false);
    assert.equal(isTrackedPublicInput(untracked, index), false);
  } finally {
    const resolved = path.resolve(root);
    if (!resolved.startsWith(path.resolve(os.tmpdir()) + path.sep) ||
        !path.basename(resolved).startsWith('scarlet-public-inputs-')) {
      throw new Error('Refusing to remove a temp path outside the named test directory');
    }
    fs.rmSync(root, { recursive: true, force: true });
  }
});
