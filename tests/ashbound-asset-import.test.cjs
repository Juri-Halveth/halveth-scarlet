const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const source = path.resolve(__dirname, '../tools/ashbound/fetch-world-assets.ps1');
const harness = path.join(__dirname, 'fixtures/ashbound-asset-import.ps1');
const shells = process.platform === 'win32' ? ['powershell.exe', 'pwsh.exe'] : ['pwsh'];
for (const shell of shells) {
  const env = { ...process.env };
  // A Node child otherwise passes PowerShell 7's module search path to Windows PowerShell.
  if (shell === 'powershell.exe') for (const key of Object.keys(env)) if (key.toLowerCase() === 'psmodulepath') delete env[key];
  const version = spawnSync(shell, ['-NoProfile', '-NonInteractive', '-Command', '$PSVersionTable.PSVersion.ToString()'], { env, encoding: 'utf8', timeout: 15000 });
  test('asset import rejects unsafe targets and preserves valid refreshes: ' + shell, { skip: version.error?.code === 'ENOENT', timeout: 120000 }, t => {
    assert.equal(version.status, 0, version.stderr || String(version.error));
    const parent = path.resolve(process.env.SCARLET_TEST_TEMP_ROOT || os.tmpdir());
    const directory = fs.mkdtempSync(path.join(parent, 'scarlet-asset-test-'));
    t.after(() => {
      assert.equal(path.dirname(directory), parent);
      assert.ok(path.basename(directory).startsWith('scarlet-asset-test-'));
      fs.rmSync(directory, { recursive: true, force: true });
    });
    const run = spawnSync(shell, ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', harness, '-SourceScript', source, '-WorkRoot', directory], {
      env, encoding: 'utf8', timeout: 110000, maxBuffer: 2 * 1024 * 1024
    });
    assert.equal(run.status, 0, run.stdout + run.stderr + (run.error || ''));
    const result = JSON.parse(run.stdout.trim());
    assert.match(result.runtime, /^\d+\./);
    assert.equal(result.cases.length, 22);
    for (const item of result.cases) assert.equal(item.passed, true, item.name);
  });
}
