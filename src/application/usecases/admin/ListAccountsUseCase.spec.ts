import { describe, expect, it } from 'vitest';

import { accountRoles } from '@application/entities/account/Account';
import type { ListAccountsByRoleQuery } from '@application/queries/admin/ListAccountsByRoleQuery';
import { ListAccountsUseCase } from '@application/usecases/admin/ListAccountsUseCase';

const emptyPage = { items: [], nextCursor: null };

describe('ListAccountsUseCase', () => {
  it('should ask the query for the role, status and page', async () => {
    const received: ListAccountsByRoleQuery.Input[] = [];
    const query: ListAccountsByRoleQuery = {
      execute: (input) => {
        received.push(input);
        return Promise.resolve(emptyPage);
      },
    };

    await new ListAccountsUseCase(query).execute({
      role: accountRoles.Student,
      status: 'ACTIVE',
      limit: 20,
      cursor: 'abc',
    });

    expect(received).toEqual([
      {
        role: 'student',
        status: 'ACTIVE',
        page: { limit: 20, cursor: 'abc' },
      },
    ]);
  });
});
