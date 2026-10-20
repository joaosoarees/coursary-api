import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

interface FunctionDefinition {
  handler: string;
  environment?: unknown;
}

const root = path.resolve(import.meta.dirname, '../../..');
const functionsDir = path.join(root, 'sls/functions');
const read = (file: string) => readFileSync(path.join(root, file), 'utf8');

const functions = readdirSync(functionsDir)
  .filter((file) => file.endsWith('.yml'))
  .flatMap((file) =>
    Object.entries(
      parse(read(`sls/functions/${file}`)) as Record<
        string,
        FunctionDefinition
      >,
    ),
  );

const handlerSource = ({ handler }: FunctionDefinition) =>
  read(`${handler.slice(0, handler.lastIndexOf('.'))}.ts`);

describe('function environment (Q325, Q344)', () => {
  it('should give every function only the table name', () => {
    expect(Object.keys(parse(read('sls/config/env.yml')) as object)).toEqual([
      'MAIN_TABLE_NAME',
    ]);
  });

  const namesWith = (file: string) =>
    functions
      .filter(([, definition]) =>
        JSON.stringify(definition.environment ?? '').includes(file),
      )
      .map(([name]) => name)
      .sort();

  it('should give the pool to exactly the functions that call Cognito', () => {
    const callingCognito = functions
      .filter(([, definition]) =>
        handlerSource(definition).includes('makeAuthGateway'),
      )
      .map(([name]) => name)
      .sort();

    expect(callingCognito).not.toHaveLength(0);
    expect(
      [
        ...namesWith('cognitoPool.yml'),
        ...namesWith('cognitoClient.yml'),
      ].sort(),
    ).toEqual(callingCognito);
  });

  // The app client secret only where an app client operation runs (Q344).
  it('should give the app client secret only to the sign-up and sign-in functions', () => {
    expect(namesWith('cognitoClient.yml')).toEqual([
      'confirmSignUp',
      'forgotPassword',
      'refreshTokens',
      'resendConfirmationCode',
      'resetPassword',
      'signIn',
      'signUp',
    ]);
  });
});
