#!/usr/bin/env node
// Runs every lib/__tests__/*.test.ts script with tsx and fails if any do.
// The suites are plain scripts that print PASS/FAIL lines and exit 1 on
// failure, so no test framework is needed.
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const dir = join(import.meta.dirname, '..', 'lib', '__tests__');
const filter = process.argv[2];
const files = readdirSync(dir)
  .filter((f) => f.endsWith('.test.ts') && (!filter || f.includes(filter)))
  .sort();

const failed = [];
for (const f of files) {
  const res = spawnSync('npx', ['tsx', join(dir, f)], { encoding: 'utf8' });
  const out = `${res.stdout ?? ''}${res.stderr ?? ''}`;
  const ok = res.status === 0;
  const summary = out.trim().split('\n').filter((l) => /passed, \d+ failed/.test(l)).join(' | ');
  console.log(`${ok ? '✓' : '✗'} ${f.padEnd(28)} ${summary}`);
  if (!ok) {
    failed.push(f);
    console.log(out.split('\n').filter((l) => /^\s*FAIL|Error/.test(l)).join('\n'));
  }
}
console.log(`\n${files.length - failed.length}/${files.length} suites passed`);
process.exit(failed.length ? 1 : 0);
