const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '../..');
const source = path.join(root, '.site-build');
const destination = path.join(__dirname, 'site');

// The website builder owns .site-build and checks its local references.
execFileSync(process.execPath, [path.join(root, 'tools', 'build_site.mjs')], {
  cwd: root,
  stdio: 'inherit',
});

if (path.resolve(destination) !== path.join(root, 'desktop', 'ashbound', 'site')) {
  throw new Error('Unexpected desktop content destination');
}
if (!fs.existsSync(path.join(source, 'forschung', 'ashbound', 'index.html'))) {
  throw new Error('ASHBOUND page missing from verified site build');
}
fs.rmSync(destination, { recursive: true, force: true });
fs.cpSync(source, destination, { recursive: true });
console.log(`Desktop content prepared: ${destination}`);
