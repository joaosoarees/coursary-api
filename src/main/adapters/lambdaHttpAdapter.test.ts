import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyEventV2WithJWTAuthorizer,
} from 'aws-lambda';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { accountWorld } from '@tests/support/accountWorld';

import { Controller } from '@application/contracts/Controller';
import { Account, accountRoles } from '@application/entities/account/Account';
import { EmailInUse } from '@application/errors/auth';
import { permissions } from '@application/security/permissions';
import { ResolveCallerUseCase } from '@application/usecases/auth/ResolveCallerUseCase';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';

const makeEvent = (body?: string, isBase64Encoded = false) =>
  ({
    body,
    isBase64Encoded,
    requestContext: { requestId: 'request-1' },
  }) as APIGatewayProxyEventV2;

const makePrivateEvent = (
  claims: Record<string, string>,
  extra: Partial<APIGatewayProxyEventV2WithJWTAuthorizer> = {},
) =>
  ({
    isBase64Encoded: false,
    ...extra,
    requestContext: {
      requestId: 'request-1',
      authorizer: { jwt: { claims, scopes: [] } },
    },
  }) as unknown as APIGatewayProxyEventV2WithJWTAuthorizer;

const parseBody = (body: string | undefined): unknown => JSON.parse(body ?? '');

class OkController extends Controller<'public', { status: string }> {
  protected handle() {
    return Promise.resolve({ statusCode: 200, body: { status: 'ok' } });
  }
}

class NoContentController extends Controller<'public'> {
  protected handle() {
    return Promise.resolve({ statusCode: 204 });
  }
}

class FailingController extends Controller<'public'> {
  protected handle(): Promise<never> {
    return Promise.reject(new Error('table is gone'));
  }
}

class EmailInUseController extends Controller<'public'> {
  protected handle(): Promise<never> {
    return Promise.reject(new EmailInUse());
  }
}

class EchoController extends Controller<'public', { name: string }> {
  protected override readonly bodySchema = z.object({
    name: z.string().min(1),
  });

  protected handle(request: Controller.Request<'public', { name: string }>) {
    return Promise.resolve({ statusCode: 200, body: request.body });
  }
}

class WhoAmIController extends Controller<'private', unknown> {
  protected handle(request: Controller.Request<'private'>) {
    return Promise.resolve({
      statusCode: 200,
      body: {
        accountId: request.accountId,
        role: request.role,
        params: request.params,
        queryParams: request.queryParams,
      },
    });
  }
}

class AdminOnlyController extends Controller<'private'> {
  protected override readonly permission = permissions.UsersList;

  protected override readonly bodySchema = z.object({ name: z.string() });

  protected handle() {
    return Promise.resolve({ statusCode: 204 });
  }
}

class PublicWhoAmIController extends Controller<'public', { accountId: null }> {
  protected handle(request: Controller.Request<'public'>) {
    return Promise.resolve({
      statusCode: 200,
      body: { accountId: request.accountId },
    });
  }
}

let world: ReturnType<typeof accountWorld>;
let resolveCaller: ResolveCallerUseCase;
let student: Account;

const addAccount = async (role: Account.Role) => {
  const account = await world.addAccount({ role });
  account.session = { accessJti: `jti-${account.id}`, refreshTokenHash: 'h' };
  await world.save(account);

  return account;
};

const claimsOf = (account: Account) => ({
  internalId: account.id,
  jti: `jti-${account.id}`,
});

beforeEach(async () => {
  world = accountWorld();
  resolveCaller = new ResolveCallerUseCase(world.accounts);
  student = await addAccount(accountRoles.Student);
});

describe('lambdaHttpAdapter', () => {
  it('should give a private route the caller and the role stored on the account', async () => {
    const admin = await addAccount(accountRoles.Admin);

    const response = await lambdaHttpAdapter(
      new WhoAmIController(),
      resolveCaller,
    )(makePrivateEvent({ ...claimsOf(admin), role: 'student' }));

    expect(parseBody(response.body)).toMatchObject({
      accountId: admin.id,
      role: 'admin',
    });
  });

  it('should pass the path and query parameters', async () => {
    const response = await lambdaHttpAdapter(
      new WhoAmIController(),
      resolveCaller,
    )(
      makePrivateEvent(claimsOf(student), {
        pathParameters: { id: 'acc-2' },
        queryStringParameters: { role: 'student' },
      }),
    );

    expect(parseBody(response.body)).toMatchObject({
      params: { id: 'acc-2' },
      queryParams: { role: 'student' },
    });
  });

  it('should answer 401 INVALID_SESSION for an account that does not exist', async () => {
    const response = await lambdaHttpAdapter(
      new WhoAmIController(),
      resolveCaller,
    )(makePrivateEvent({ internalId: 'deleted-account', jti: 'jti' }));

    expect(response.statusCode).toBe(401);
    expect(parseBody(response.body)).toMatchObject({
      error: { code: 'INVALID_SESSION' },
    });
  });

  it('should answer 403 ACCOUNT_UNAVAILABLE for an account that is no longer active', async () => {
    student.status = 'DISABLED';
    await world.save(student);

    const response = await lambdaHttpAdapter(
      new WhoAmIController(),
      resolveCaller,
    )(makePrivateEvent(claimsOf(student)));

    expect(response.statusCode).toBe(403);
    expect(parseBody(response.body)).toMatchObject({
      error: { code: 'ACCOUNT_UNAVAILABLE' },
    });
  });

  it('should answer 403 FORBIDDEN by the stored role, whatever the token says, before reading the body', async () => {
    const response = await lambdaHttpAdapter(
      new AdminOnlyController(),
      resolveCaller,
    )(makePrivateEvent({ ...claimsOf(student), role: 'admin' }));

    expect(response.statusCode).toBe(403);
    expect(parseBody(response.body)).toEqual({
      error: { code: 'FORBIDDEN', message: 'You are not allowed to do this.' },
    });
  });

  it('should answer 401 INVALID_SESSION for a token of an earlier session', async () => {
    const response = await lambdaHttpAdapter(
      new WhoAmIController(),
      resolveCaller,
    )(makePrivateEvent({ internalId: student.id, jti: 'jti-earlier' }));

    expect(response.statusCode).toBe(401);
    expect(parseBody(response.body)).toMatchObject({
      error: { code: 'INVALID_SESSION' },
    });
  });

  it('should give a public route no account id', async () => {
    const response = await lambdaHttpAdapter(new PublicWhoAmIController())(
      makeEvent(),
    );

    expect(parseBody(response.body)).toEqual({ accountId: null });
  });

  it('should answer 401 INVALID_SESSION for a token without the internal id', async () => {
    const response = await lambdaHttpAdapter(
      new WhoAmIController(),
      resolveCaller,
    )(makePrivateEvent({ sub: 'cognito-sub' }));

    expect(response.statusCode).toBe(401);
    expect(parseBody(response.body)).toMatchObject({
      error: { code: 'INVALID_SESSION' },
    });
  });

  it('should return the status code and the body as JSON', async () => {
    const response = await lambdaHttpAdapter(new OkController())(makeEvent());

    expect(response).toEqual({
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: '{"status":"ok"}',
    });
  });

  it('should leave the body out when the controller returns none', async () => {
    const response = await lambdaHttpAdapter(new NoContentController())(
      makeEvent(),
    );

    expect(response.statusCode).toBe(204);
    expect(response.body).toBeUndefined();
  });

  it('should pass the parsed and validated body to the controller', async () => {
    const response = await lambdaHttpAdapter(new EchoController())(
      makeEvent('{"name":"Ana","extra":true}'),
    );

    expect(parseBody(response.body)).toEqual({ name: 'Ana' });
  });

  it('should decode a body the API delivers in base64', async () => {
    const response = await lambdaHttpAdapter(new EchoController())(
      makeEvent(Buffer.from('{"name":"Ana"}').toString('base64'), true),
    );

    expect(parseBody(response.body)).toEqual({ name: 'Ana' });
  });

  it('should answer 400 VALIDATION with the failing fields', async () => {
    const response = await lambdaHttpAdapter(new EchoController())(
      makeEvent('{"name":""}'),
    );

    expect(response.statusCode).toBe(400);
    expect(parseBody(response.body)).toMatchObject({
      error: { code: 'VALIDATION', details: [{ field: 'name' }] },
    });
  });

  it('should answer 400 BAD_REQUEST when the body is not JSON', async () => {
    const response = await lambdaHttpAdapter(new EchoController())(
      makeEvent('{name'),
    );

    expect(response.statusCode).toBe(400);
    expect(parseBody(response.body)).toMatchObject({
      error: { code: 'BAD_REQUEST' },
    });
  });

  it('should answer an application error with its own status and code', async () => {
    const response = await lambdaHttpAdapter(new EmailInUseController())(
      makeEvent(),
    );

    expect(response.statusCode).toBe(409);
    expect(parseBody(response.body)).toEqual({
      error: {
        code: 'EMAIL_IN_USE',
        message: 'This e-mail address is already registered.',
      },
    });
  });

  it('should answer 500 without the error message when the controller throws', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const response = await lambdaHttpAdapter(new FailingController())(
      makeEvent(),
    );

    expect(response.statusCode).toBe(500);
    expect(parseBody(response.body)).toEqual({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error.',
      },
    });
  });

  it('should log the request id and the error when the controller throws', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await lambdaHttpAdapter(new FailingController())(makeEvent());

    const entry = JSON.parse(String(log.mock.calls[0]?.[0])) as {
      requestId: string;
      error: { message: string };
    };
    expect(entry.requestId).toBe('request-1');
    expect(entry.error.message).toBe('table is gone');
  });
});
