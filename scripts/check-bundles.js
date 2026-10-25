// Loads every packaged handler the way Lambda does: unzipped away from the
// project, in a separate node process, with only the AWS SDK available (Q135, Q155),
// and sharp for the functions with its layer (Q387). The layer's own arm64 binary
// cannot load here: scripts/check-layers.sh checks it.
import { execFileSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const work = mkdtempSync(join(tmpdir(), 'coursary-bundles-'));
const packageDir = join(work, 'package');

// A stage that is never deployed: with a layer, the framework describes the stage's
// stack while packaging, which the CI role may not do; a missing stack is tolerated (Q397).
execFileSync(
  'pnpm',
  [
    'exec',
    'serverless',
    'package',
    '--stage',
    'bundles',
    '--package',
    packageDir,
  ],
  { cwd: root, stdio: 'inherit' },
);

// What the Lambda runtime does not provide must be in the bundle, or loading fails here too.
const notInRuntime = new Set(['s3-presigned-post', 's3-request-presigner']);
const runtimeSdk = readdirSync(join(root, 'node_modules', '@aws-sdk')).filter(
  (name) => !notInRuntime.has(name),
);

const state = JSON.parse(
  readFileSync(join(packageDir, 'serverless-state.json'), 'utf8'),
);
let failures = 0;

for (const [name, fn] of Object.entries(state.service.functions)) {
  const dir = join(work, name);
  mkdirSync(join(dir, 'node_modules', '@aws-sdk'), { recursive: true });
  execFileSync('unzip', [
    '-q',
    join(packageDir, basename(fn.package.artifact)),
    '-d',
    dir,
  ]);
  for (const name of runtimeSdk) {
    symlinkSync(
      join(root, 'node_modules', '@aws-sdk', name),
      join(dir, 'node_modules', '@aws-sdk', name),
    );
  }

  // The state keeps layers as a reference into the template: any value means some.
  if (fn.layers) {
    symlinkSync(
      join(root, 'node_modules', 'sharp'),
      join(dir, 'node_modules', 'sharp'),
    );
  }

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
