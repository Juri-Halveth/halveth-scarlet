import { execFileSync } from 'node:child_process';

// Git status covers tracked and non-ignored untracked files. It does not
// attest that every copied build byte belongs to HEAD.
export function sourceTreeState(root) {
  const status = execFileSync('git', ['status', '--porcelain=v1', '--untracked-files=all'], {
    cwd: root,
    encoding: 'utf8',
  });
  return status ? 'GIT_STATUS_DIRTY' : 'GIT_STATUS_CLEAN';
}
