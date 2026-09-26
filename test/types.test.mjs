// Regression test for issue #4: subpath exports (./string, ./har, ./curl,
// ./fetch, ./body, ./random, ./core/utils) had no `types` condition in
// package.json's `exports` map, and `allFormats` was missing entirely from
// types.d.ts. Both made real TypeScript code fail to compile (TS7016 /
// TS2305) even though the runtime worked fine.
//
// This runs the real TypeScript compiler against test/types/check-types.ts,
// which imports from every subpath (via package self-reference) and calls
// allFormats(). If either gap regresses, `tsc` exits non-zero.
//
// typescript@7's compiler API surface (`require('typescript')`) is just
// `{ version, versionMajorMinor }` now -- the actual checker moved behind
// the CLI entry point, so this has to shell out. `node_modules/.bin/tsc`
// is itself only a POSIX shebang -> `../lib/tsc.js`; on Windows the real
// executable is `.bin/tsc.cmd`, and spawnSync needs `shell: true` to launch
// a `.cmd` at all (that auto-wrap only happens for `exec`, not `spawn`).
// Skip the `.bin` shim entirely and spawn `node` directly against
// `typescript/lib/tsc.js` -- identical on every platform, since it's
// `node <script>` either way.
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const tscEntry = path.join(repoRoot, 'node_modules', 'typescript', 'lib', 'tsc.js');
const tsconfig = path.join(__dirname, 'types', 'tsconfig.json');

test('subpath exports and allFormats() type-check with a real tsc --noEmit', () => {
  const result = spawnSync(process.execPath, [tscEntry, '--noEmit', '-p', tsconfig], {
    cwd: repoRoot,
    encoding: 'utf8',
  });

  assert.equal(
    result.status,
    0,
    `tsc --noEmit failed (exit ${result.status}):\n${result.stdout}${result.stderr}`
  );
});
