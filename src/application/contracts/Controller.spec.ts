import { describe, expect, it } from 'vitest';
import { z, ZodError } from 'zod';

import { anAccountId } from '@tests/support/ids';

import { Controller } from '@application/contracts/Controller';
import { Account, accountRoles } from '@application/entities/account/Account';
import { Forbidden } from '@application/errors/common';
import { permissions } from '@application/security/permissions';

class ListUsersController extends Controller<'private', unknown> {
  protected override readonly permission = permissions.UsersList;

  protected override readonly paramsSchema = z.object({ id: z.string() });

  protected override readonly queryParamsSchema = z.object({
    limit: z.coerce.number(),
  });

  protected override readonly bodySchema = z.object({ name: z.string() });

  protected handle(request: Controller.Request<'private'>) {
    return Promise.resolve({ statusCode: 200, body: request });
  }
}

const makeRequest = (
  overrides: Partial<Controller.Request<'private'>> = {},
): Controller.Request<'private'> => ({
  accountId: anAccountId(),
  role: accountRoles.Admin,
  account: Account.create({ name: 'Ana', email: 'ana@example.com' }),
  params: { id: 'acc-2' },
  queryParams: { limit: '20' },
  body: { name: 'Ana' },
  ...overrides,
});

describe('Controller', () => {
  it('should pass the parsed params, query and body to the handler', async () => {
    const response = await new ListUsersController().execute(makeRequest());

    expect(response.body).toMatchObject({
      params: { id: 'acc-2' },
      queryParams: { limit: 20 },
      body: { name: 'Ana' },
    });
  });

  it('should refuse a role without the permission', async () => {
    const execute = new ListUsersController().execute(
      makeRequest({ role: accountRoles.Student }),
    );

    await expect(execute).rejects.toBeInstanceOf(Forbidden);
  });

  it('should refuse before validating anything', async () => {
    const execute = new ListUsersController().execute(
      makeRequest({ role: accountRoles.Instructor, params: {}, body: {} }),
    );

    await expect(execute).rejects.toBeInstanceOf(Forbidden);
  });

  it('should validate once the role is allowed', async () => {
    const execute = new ListUsersController().execute(
      makeRequest({ params: {} }),
    );

    await expect(execute).rejects.toBeInstanceOf(ZodError);
  });
});
