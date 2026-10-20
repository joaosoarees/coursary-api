// Loads every packaged handler the way Lambda does: unzipped away from the
// project, in a separate node process, with only the AWS SDK available (Q135, Q155).
import { execFileSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const work = mkdtempSync(join(tmpdir(), 'coursary-bundles-'));
const packageDir = join(work, 'package');

execFileSync(
  'pnpm',
  ['exec', 'serverless', 'package', '--stage', 'dev', '--package', packageDir],
  { cwd: root, stdio: 'inherit' },
);

const state = JSON.parse(
  readFileSync(join(packageDir, 'serverless-state.json'), 'utf8'),
);
let failures = 0;

for (const [name, fn] of Object.entries(state.service.functions)) {
  const dir = join(work, name);
  mkdirSync(join(dir, 'node_modules'), { recursive: true });
  execFileSync('unzip', [
    '-q',
    join(packageDir, basename(fn.package.artifact)),
    '-d',
    dir,
  ]);
  symlinkSync(
    join(root, 'node_modules', '@aws-sdk'),
    join(dir, 'node_modules', '@aws-sdk'),
  );

  const exportName = fn.handler.split('.').at(-1);
  const file = fn.handler.slice(0, -exportName.length - 1);
  writeFileSync(
    join(dir, 'load.mjs'),
    `const m = await import('./${file}.js');\n` +
      `if (typeof m.${exportName} !== 'function') throw new Error('${fn.handler} exports no function');\n`,
  );

  try {
    execFileSync(process.execPath, ['load.mjs'], {
      cwd: dir,
      env: { PATH: process.env.PATH },
      stdio: 'pipe',
    });
    console.log(`ok   ${name}`);
  } catch (error) {
    failures += 1;
    const reason = String(error.stderr)
      .split('\n')
      .filter((line) => /^\w*Error\b/.test(line))
      .join('\n');
    console.error(
      `FAIL ${name}: ${reason || String(error.stderr).slice(-500)}`,
    );
  }
}

process.exit(failures === 0 ? 0 : 1);
