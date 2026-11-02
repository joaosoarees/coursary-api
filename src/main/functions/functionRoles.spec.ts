import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { parseCloudFormation } from '@tests/support/cloudFormationYaml';

interface FunctionDefinition {
  iam?: { role?: { statements?: unknown[] } };
}

const root = path.resolve(import.meta.dirname, '../../..');
const functionsDir = path.join(root, 'sls/functions');

const functions = readdirSync(functionsDir)
  .filter((file) => file.endsWith('.yml'))
  .flatMap((file) =>
    Object.entries(
      parseCloudFormation(
        readFileSync(path.join(functionsDir, file), 'utf8'),
      ) as Record<string, FunctionDefinition>,
    ),
  );

describe('function roles (Q537)', () => {
  it('should run every function with its own role', () => {
    expect(
      parseCloudFormation(
        readFileSync(path.join(root, 'sls/provider.yml'), 'utf8'),
      ),
    ).toMatchObject({ iam: { role: { mode: 'perFunction' } } });
  });

  it('should declare what every function may call, even when it is nothing', () => {
    const undeclared = functions
      .filter(
        ([, definition]) => !Array.isArray(definition.iam?.role?.statements),
      )
      .map(([name]) => name);

    expect(undeclared).toEqual([]);
  });
});
