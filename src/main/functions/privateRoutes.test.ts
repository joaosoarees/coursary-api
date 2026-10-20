import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { PutCommand } from '@aws-sdk/lib-dynamodb';
import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyStructuredResultV2,
} from 'aws-lambda';
import { beforeAll, describe, expect, it } from 'vitest';
import { parse } from 'yaml';

import { Account, accountRoles } from '@application/entities/account/Account';
import { dynamoClient } from '@infra/clients/dynamoClient';
import { AccountItem } from '@infra/database/dynamo/items/account/AccountItem';
import { AppConfig } from '@shared/config/AppConfig';

interface FunctionDefinition {
  handler: string;
  events?: {
    httpApi?: {
      method: string;
      path: string;
      authorizer?: Authorizer | string;
    };
  }[];
}

interface Authorizer {
  name: string;
  scopes?: string[];
}

type Handler = (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
) => Promise<APIGatewayProxyStructuredResultV2>;

const root = path.resolve(import.meta.dirname, '../../..');
const functionsDir = path.join(root, 'sls/functions');

// Reads `${file(./sls/config/x.yml)}` the way the framework does.
const resolveFile = (value: Authorizer | string | undefined) => {
  const file =
    typeof value === 'string' && /^\$\{file\((.+)\)\}$/.exec(value)?.[1];

  return file
    ? (parse(readFileSync(path.join(root, file), 'utf8')) as Authorizer)
    : (value as Authorizer | undefined);
};

const httpRoutes = readdirSync(functionsDir)
  .filter((file) => file.endsWith('.yml'))
  .flatMap((file) => {
    const definitions = parse(
      readFileSync(path.join(functionsDir, file), 'utf8'),
    ) as Record<string, FunctionDefinition>;

    return Object.values(definitions).flatMap((definition) =>
      (definition.events ?? []).flatMap((event) =>
        event.httpApi
          ? [
              {
                handler: definition.handler,
                ...event.httpApi,
                authorizer: resolveFile(event.httpApi.authorizer),
              },
            ]
          : [],
      ),
    );
  });

const privateRoutes = httpRoutes.filter((route) => route.authorizer);
const adminRoutes = httpRoutes.filter((route) =>
  route.path.startsWith('/admin'),
);

async function loadHandler(handler: string): Promise<Handler> {
  const [file = '', exportName = ''] = handler.split(/\.(?=[^.]+$)/);
  const module = (await import(path.join(root, `${file}.ts`))) as Record<
    string,
    Handler
  >;
  const loaded = module[exportName];

  if (!loaded) {
    throw new Error(`${handler} does not export a handler.`);
  }

  return loaded;
}

const eventFor = (account: Account, jti = `jti-${account.id}`) =>
  ({
    isBase64Encoded: false,
    requestContext: {
      requestId: 'audit',
      authorizer: {
        jwt: { claims: { internalId: account.id, jti }, scopes: [] },
      },
    },
  }) as unknown as APIGatewayProxyEventV2WithJWTAuthorizer;

async function putAccount(status: Account.Status): Promise<Account> {
  const account = Account.create({
    name: 'Ana',
    email: `audit-${crypto.randomUUID()}@example.com`,
  });
  account.status = status;
  account.role = accountRoles.Student;
  account.session = { accessJti: `jti-${account.id}`, refreshTokenHash: 'h' };
  const command = new PutCommand({
    TableName: new AppConfig().mainTableName,
    Item: AccountItem.fromEntity(account).toItem(),
  });

  await dynamoClient.send(command);

  return account;
}

let student: Account;
let disabled: Account;

beforeAll(async () => {
  student = await putAccount('ACTIVE');
  disabled = await putAccount('DISABLED');
});

// Every route without the authorizer is on purpose; a new one must be added here.
const publicRoutes = [
  'GET /health',
  'POST /auth/sign-up',
  'POST /auth/confirm',
  'POST /auth/resend-code',
  'POST /auth/sign-in',
  'POST /auth/refresh',
  'POST /auth/forgot-password',
  'POST /auth/reset-password',
  'GET /courses',
  'GET /courses/{courseId}',
  'GET /courses/{courseId}/reviews',
  'GET /search',
];

describe('public routes', () => {
  it('should be only the ones meant to be public', () => {
    const open = httpRoutes
      .filter((route) => !route.authorizer)
      .map((route) => `${route.method} ${route.path}`);

    expect(open.sort()).toEqual([...publicRoutes].sort());
  });
});

describe('private routes', () => {
  it('should include every admin route', () => {
    expect(adminRoutes.length).toBeGreaterThan(0);
    expect(adminRoutes.every((route) => route.authorizer)).toBe(true);
  });

  it.each(privateRoutes)(
    '$method $path should require the access token scope and refuse a disabled account before the resource',
    async ({ handler, authorizer }) => {
      const response = await (await loadHandler(handler))(eventFor(disabled));

      // Only the access token carries this scope; an id token stops at the gateway (Q301).
      expect(authorizer).toEqual({
        name: 'CognitoAuthorizer',
        scopes: ['aws.cognito.signin.user.admin'],
      });
      expect(response.statusCode).toBe(403);
      expect(response.body).toContain('ACCOUNT_UNAVAILABLE');
    },
  );

  it.each(privateRoutes)(
    '$method $path should refuse a token of an earlier session',
    async ({ handler }) => {
      const response = await (
        await loadHandler(handler)
      )(eventFor(student, 'jti-earlier'));

      expect(response.statusCode).toBe(401);
      expect(response.body).toContain('INVALID_SESSION');
    },
  );

  it.each(adminRoutes)(
    '$method $path should refuse a student',
    async ({ handler }) => {
      const response = await (await loadHandler(handler))(eventFor(student));

      expect(response.statusCode).toBe(403);
      expect(response.body).toContain('FORBIDDEN');
    },
  );
});
