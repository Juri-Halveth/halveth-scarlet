import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

// Identifies the shipped pilot assets and both locally corrected heads, even after a rename.
const retiredBodiesAndClips = new Set([
  "473e59080288428d0b6da826ba19324d07b191f0",
  "669ed3f54c5b13df96ff06b168f4ab6bef194e1f",
  "69cc8b064642fe75b5f1cd6b5baf6e8947d7b1d8",
  "c2ca2272e08efed824a340e35761ded4e2f8ae63",
  "0b763b4a3b553674e5a4a1303460e1ea27703ae7",
  "6e58a25cf38b20fed67943280ea5b284ecabb10e",
  "481ed82f3a9a7017ea060d24a7223542153ea475",
]);

test("tracked files exclude the retired character pilot", () => {
  const entries = execFileSync("git", ["ls-files", "--stage", "-z"], {
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    encoding: "utf8",
  }).split("\0").filter(Boolean);
  for (const entry of entries) {
    const end = entry.indexOf("\t");
    const object = entry.slice(0, end).split(" ")[1];
    assert.ok(!retiredBodiesAndClips.has(object), entry.slice(end + 1));
  }
});
