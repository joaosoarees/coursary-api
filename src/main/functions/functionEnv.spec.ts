import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { parseCloudFormation } from '@tests/support/cloudFormationYaml';

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
      parseCloudFormation(read(`sls/functions/${file}`)) as Record<
        string,
        FunctionDefinition
      >,
    ),
  );

const handlerSource = ({ handler }: FunctionDefinition) =>
  read(`${handler.slice(0, handler.lastIndexOf('.'))}.ts`);

describe('function environment (Q325, Q344)', () => {
  it('should give every function only the table name', () => {
    expect(
      Object.keys(parseCloudFormation(read('sls/config/env.yml')) as object),
    ).toEqual(['MAIN_TABLE_NAME']);
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
        ...namesWith('session.yml'),
      ].sort(),
    ).toEqual(callingCognito);
  });

  it('should give the app client secret only to the sign-up and sign-in functions', () => {
    // session.yml carries the client too, with the site's origin.
    const withClient = [
      ...namesWith('cognitoClient.yml'),
      ...namesWith('session.yml'),
    ].sort();

    expect(withClient).toEqual([
      'confirmSignUp',
      'forgotPassword',
      'refreshTokens',
      'resendConfirmationCode',
      'resetPassword',
      'signIn',
      'signOut',
      'signUp',
    ]);
  });

  it('should give the CDN domain to exactly the functions that build image URLs', () => {
    const buildingUrls = functions
      .filter(([, definition]) =>
        /makePublicAssetUrls|makeCatalogQuery|makeCoursePageQuery|makeListMyEnrollmentsQuery|makeListCoursesByInstructorQuery/.test(
          handlerSource(definition),
        ),
      )
      .map(([name]) => name)
      .sort();

    expect(buildingUrls).not.toHaveLength(0);
    expect(namesWith('cdn.yml')).toEqual(buildingUrls);
  });
});
