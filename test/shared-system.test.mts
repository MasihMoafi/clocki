// Clocki takes the UI lint of ~/Desktop/p/shared-system (skills/shared-system, requirements 6 and 7): it runs here with
// today's findings listed in ui-check.known.json (the list may only shrink), and the generated copy must match its
// source. Where the shared folder is absent (a fresh clone, CI), the copy is used as it is.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const run = (script: string, ...args: string[]) =>
  spawnSync(process.execPath, ['--experimental-strip-types', path.join(root, script), ...args], { cwd: root, encoding: 'utf8' });

test('the UI lint finds nothing beyond the known findings', () => {
  const lint = run('scripts/ui-lint.mts');
  assert.equal(lint.status, 0, lint.stdout + lint.stderr);
});

test('the generated copy of the UI lint matches its source', () => {
  const sync = run('scripts/ui-lint-sync.mts', '--check');
  assert.equal(sync.status, 0, sync.stdout + sync.stderr);
});
