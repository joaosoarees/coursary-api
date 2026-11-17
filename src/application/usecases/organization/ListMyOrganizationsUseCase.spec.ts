import KSUID from 'ksuid';
import { describe, expect, it } from 'vitest';

import { Account } from '@application/entities/account/Account';
import type { ListMyOrganizationsQuery } from '@application/queries/organization/ListMyOrganizationsQuery';
import { ListMyOrganizationsUseCase } from '@application/usecases/organization/ListMyOrganizationsUseCase';

describe('ListMyOrganizationsUseCase', () => {
  it("should ask the query for the caller's organizations and the page", async () => {
    const callerId = Account.toId(KSUID.randomSync().string);
    const received: ListMyOrganizationsQuery.Input[] = [];
    const query: ListMyOrganizationsQuery = {
      execute: (input) => {
        received.push(input);
        return Promise.resolve({ items: [], nextCursor: null });
      },
    };

    await new ListMyOrganizationsUseCase(query).execute({
      callerId,
      limit: 20,
      cursor: 'abc',
    });

    expect(received).toEqual([
      { accountId: callerId, page: { limit: 20, cursor: 'abc' } },
    ]);
  });
});
