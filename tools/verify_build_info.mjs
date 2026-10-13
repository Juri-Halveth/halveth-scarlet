import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { sourceTreeState } from './source_state.mjs';
import { siteTreeReceipt } from './artifact_tree.mjs';

export function verifyCommitBoundBuild(root) {
  const info = JSON.parse(fs.readFileSync(path.join(root, '.site-build', 'build-info.json'), 'utf8'));
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  if (info.schema !== 'halveth.scarlet-build.v2' || info.sourceCommit !== commit ||
      info.sourceTreeState !== 'GIT_STATUS_CLEAN' || sourceTreeState(root) !== 'GIT_STATUS_CLEAN') {
    throw new Error('Public build is not bound to a clean source commit');
  }
  const tree = siteTreeReceipt(path.join(root, '.site-build'));
  if (info.artifactTreeDigest !== tree.artifactTreeDigest || info.artifactFileCount !== tree.artifactFileCount) {
    throw new Error('Public build artifact bytes differ from receipt');
  }
  return info;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const info = verifyCommitBoundBuild(root);
  console.log(`Commit-bound public build verified: ${info.sourceCommit}; ${info.artifactFileCount} files; ${info.artifactTreeDigest}`);
}
