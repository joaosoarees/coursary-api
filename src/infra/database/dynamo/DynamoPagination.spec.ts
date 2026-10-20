import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { InvalidCursor } from '@application/errors/common';
import { DynamoPagination } from '@infra/database/dynamo/DynamoPagination';

const pagination = new DynamoPagination(
  z.strictObject({
    PK: z.literal('ROLE#admin'),
    SK: z.string().startsWith('ACCOUNT#'),
  }),
);

describe('DynamoPagination cursor', () => {
  it('should read back the key it encoded', () => {
    const key = { PK: 'ROLE#admin', SK: 'ACCOUNT#1' };

    const cursor = pagination.encodeCursor(key);

    expect(cursor).toMatch(/^[\w-]+$/);
    expect(pagination.decodeCursor(cursor)).toEqual(key);
  });

  it('should refuse a cursor that is not base64url JSON', () => {
    expect(() => pagination.decodeCursor('not json')).toThrow(InvalidCursor);
  });

  it('should refuse a key from another list', () => {
    const otherRole = pagination.encodeCursor({
      PK: 'ROLE#student',
      SK: 'ACCOUNT#1',
    });
    const extraAttribute = pagination.encodeCursor({
      PK: 'ROLE#admin',
      SK: 'ACCOUNT#1',
      role: 'admin',
    });

    expect(() => pagination.decodeCursor(otherRole)).toThrow(InvalidCursor);
    expect(() => pagination.decodeCursor(extraAttribute)).toThrow(
      InvalidCursor,
    );
  });
});
