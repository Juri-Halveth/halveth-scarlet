import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { sourceTreeState } from '../tools/source_state.mjs';
import { verifyCommitBoundBuild } from '../tools/verify_build_info.mjs';

test('build provenance distinguishes a clean commit from local changes', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'scarlet-source-state-'));
  const tempRoot = fs.realpathSync(os.tmpdir());
  t.after(() => {
    if (path.dirname(fs.realpathSync(root)) !== tempRoot) throw new Error('Unexpected temporary test path');
    fs.rmSync(root, { recursive: true, force: true });
  });
  const git = (...args) => execFileSync('git', args, { cwd: root, stdio: 'pipe' });
  git('init', '--quiet');
  fs.writeFileSync(path.join(root, 'index.html'), '<title>Base</title>\n');
  fs.writeFileSync(path.join(root, '.gitignore'), '.site-build/\n');
  git('add', 'index.html', '.gitignore');
  git('-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '--quiet', '-m', 'Fixture');
  assert.equal(sourceTreeState(root), 'GIT_STATUS_CLEAN');
  const commit = git('rev-parse', 'HEAD').toString().trim();
  const build = path.join(root, '.site-build');
  fs.mkdirSync(build);
  const infoPath = path.join(build, 'build-info.json');
  const info = { schema: 'halveth.scarlet-build.v1', sourceCommit: commit, sourceTreeState: 'GIT_STATUS_CLEAN' };
  fs.writeFileSync(infoPath, JSON.stringify(info));
  assert.deepEqual(verifyCommitBoundBuild(root), info);

  fs.writeFileSync(path.join(root, 'index.html'), '<title>Changed</title>\n');
  assert.equal(sourceTreeState(root), 'GIT_STATUS_DIRTY');
  assert.throws(() => verifyCommitBoundBuild(root), /not bound to a clean source commit/);
  git('restore', 'index.html');
  fs.writeFileSync(path.join(root, 'extra.txt'), 'New public input\n');
  assert.equal(sourceTreeState(root), 'GIT_STATUS_DIRTY');
  assert.throws(() => verifyCommitBoundBuild(root), /not bound to a clean source commit/);
  fs.rmSync(path.join(root, 'extra.txt'));
  fs.writeFileSync(infoPath, JSON.stringify({ ...info, sourceTreeState: 'GIT_STATUS_DIRTY' }));
  assert.throws(() => verifyCommitBoundBuild(root), /not bound to a clean source commit/);
});
