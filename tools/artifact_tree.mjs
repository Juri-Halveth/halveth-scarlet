import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const byName = (left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0;
const length32 = value => { const buffer = Buffer.alloc(4); buffer.writeUInt32BE(value); return buffer; };
const length64 = value => { const buffer = Buffer.alloc(8); buffer.writeBigUInt64BE(BigInt(value)); return buffer; };

// The receipt itself is excluded to avoid a recursive hash. Every other
// regular output file contributes its relative path and exact bytes.
export function siteTreeReceipt(root) {
  const hash = createHash('sha256');
  hash.update('halveth.scarlet-site-tree.v1\0', 'utf8');
  let fileCount = 0;
  const visit = directory => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort(byName)) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) { visit(absolute); continue; }
      if (!entry.isFile()) throw new Error(`Non-regular file in site artifact: ${absolute}`);
      const relative = path.relative(root, absolute).split(path.sep).join('/');
      if (relative === 'build-info.json') continue;
      const name = Buffer.from(relative, 'utf8');
      const bytes = fs.readFileSync(absolute);
      hash.update(length32(name.length));
      hash.update(name);
      hash.update(length64(bytes.length));
      hash.update(bytes);
      fileCount += 1;
    }
  };
  visit(root);
  return { artifactTreeDigest: `sha256:${hash.digest('hex')}`, artifactFileCount: fileCount };
}
