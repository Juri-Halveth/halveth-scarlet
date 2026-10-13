import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

// A clean git status excludes ignored files. Public copying must use the
// tracked index instead so local ignored material cannot enter an artifact.
export function trackedSourceFiles(root) {
  const names = execFileSync('git', ['ls-files', '--cached', '-z'], {
    cwd: root,
    encoding: 'utf8',
  });
  return new Set(names.split('\0').filter(Boolean).map(name =>
    path.resolve(root, name.split('/').join(path.sep))));
}

export function isTrackedPublicInput(candidate, trackedFiles) {
  const absolute = path.resolve(candidate);
  const stat = fs.lstatSync(absolute);
  if (stat.isDirectory()) {
    return [...trackedFiles].some(file => file.startsWith(absolute + path.sep));
  }
  if (!trackedFiles.has(absolute)) return false;
  if (!stat.isFile()) throw new Error(`Tracked public input is not a regular file: ${absolute}`);
  return true;
}
