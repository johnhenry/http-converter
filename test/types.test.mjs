// Regression test for issue #4: subpath exports (./string, ./har, ./curl,
// ./fetch, ./body, ./random, ./core/utils) had no `types` condition in
// package.json's `exports` map, and `allFormats` was missing entirely from
// types.d.ts. Both made real TypeScript code fail to compile (TS7016 /
// TS2305) even though the runtime worked fine.
//
// This runs the real TypeScript compiler against test/types/check-types.ts,
// which imports from every subpath (via package self-reference) and calls
// allFormats(). If either gap regresses, `tsc` exits non-zero.
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
// On Windows, npm installs CLI shims as `.cmd` (and `.ps1`) files, not the
// extensionless POSIX shebang script that lives at `.bin/tsc`. Resolving the
// extensionless path directly on win32 makes spawnSync fail to launch the
// process at all (result.status === null, result.stdout/stderr undefined),
// since that file isn't natively executable there. Node's child_process
// already special-cases `.cmd`/`.bat` targets on win32 by wrapping them with
// cmd.exe internally, so pointing at the real `.cmd` shim works cross-platform
// without needing `shell: true` (which would reintroduce shell-quoting/
// injection concerns for `.cmd`/`.bat` targets).
const tsc = path.join(
  repoRoot,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'tsc.cmd' : 'tsc'
);
const tsconfig = path.join(__dirname, 'types', 'tsconfig.json');

test('subpath exports and allFormats() type-check with a real tsc --noEmit', () => {
  const result = spawnSync(tsc, ['--noEmit', '-p', tsconfig], {
    cwd: repoRoot,
    encoding: 'utf8',
  });

  assert.equal(
    result.status,
    0,
    `tsc --noEmit failed (exit ${result.status}):\n${result.stdout}${result.stderr}`
  );
});
