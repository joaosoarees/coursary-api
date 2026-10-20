import { describe, expect, it } from 'vitest';

import {
  changeRoleSchema,
  listAccountsSchema,
} from '@application/controllers/admin/schemas';
import { accountIdParamsSchema } from '@application/controllers/admin/schemas';

describe('listAccountsSchema', () => {
  it('should default to 20 items and read the limit from the query string', () => {
    expect(listAccountsSchema.parse({ role: 'student' })).toEqual({
      role: 'student',
      limit: 20,
    });
    expect(listAccountsSchema.parse({ role: 'admin', limit: '100' })).toEqual({
      role: 'admin',
      limit: 100,
    });
  });

  it('should refuse a missing role, an unknown status and a limit over 100', () => {
    expect(listAccountsSchema.safeParse({}).success).toBe(false);
    expect(
      listAccountsSchema.safeParse({ role: 'student', status: 'GONE' }).success,
    ).toBe(false);
    expect(
      listAccountsSchema.safeParse({ role: 'student', limit: '101' }).success,
    ).toBe(false);
  });
});

describe('changeRoleSchema', () => {
  it('should accept only the three roles', () => {
    expect(changeRoleSchema.safeParse({ role: 'instructor' }).success).toBe(
      true,
    );
    expect(changeRoleSchema.safeParse({ role: 'owner' }).success).toBe(false);
  });
});

describe('accountIdParamsSchema', () => {
  it('should accept a KSUID and refuse a malformed id', () => {
    expect(
      accountIdParamsSchema.safeParse({
        accountId: '2Wk1zbcTqPHEuTXoAXZRDcjYKKK',
      }).success,
    ).toBe(true);
    expect(
      accountIdParamsSchema.safeParse({ accountId: 'missing' }).success,
    ).toBe(false);
  });
});
