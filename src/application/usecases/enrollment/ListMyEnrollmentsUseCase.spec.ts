import KSUID from 'ksuid';
import { describe, expect, it } from 'vitest';

import { Account } from '@application/entities/account/Account';
import type { ListMyEnrollmentsQuery } from '@application/queries/enrollment/ListMyEnrollmentsQuery';
import { ListMyEnrollmentsUseCase } from '@application/usecases/enrollment/ListMyEnrollmentsUseCase';

describe('ListMyEnrollmentsUseCase', () => {
  it('should ask the query for the caller enrollments and the page', async () => {
    const callerId = Account.toId(KSUID.randomSync().string);
    const received: ListMyEnrollmentsQuery.Input[] = [];
    const query: ListMyEnrollmentsQuery = {
      execute: (input) => {
        received.push(input);
        return Promise.resolve({ items: [], nextCursor: null });
      },
    };

    await new ListMyEnrollmentsUseCase(query).execute({
      callerId,
      limit: 20,
      cursor: 'abc',
    });

    expect(received).toEqual([
      { accountId: callerId, page: { limit: 20, cursor: 'abc' } },
    ]);
  });
});
