import { describe, expect, it } from 'vitest';

import {
  Account,
  accountStatuses,
} from '@application/entities/account/Account';
import { AccountUnavailable } from '@application/errors/auth';

describe('Account.create', () => {
  it('should start as a pending student', () => {
    const account = Account.create({ name: 'Ana', email: 'ana@example.com' });

    expect(account.role).toBe('student');
    expect(account.status).toBe('PENDING');
    expect(account.externalId).toBeUndefined();
  });

  it('should give the account a KSUID', () => {
    const account = Account.create({ name: 'Ana', email: 'ana@example.com' });

    expect(account.id).toMatch(/^[0-9A-Za-z]{27}$/);
  });

  it('should give later accounts ids that sort after earlier ones', async () => {
    const first = Account.create({ name: 'Ana', email: 'ana@example.com' });
    await new Promise((resolve) => setTimeout(resolve, 1100));
    const second = Account.create({ name: 'Bia', email: 'bia@example.com' });

    expect(first.id < second.id).toBe(true);
  });

  it('should trim the name and normalize the e-mail', () => {
    const account = Account.create({
      name: '  Ana Souza ',
      email: ' Ana@Example.COM ',
    });

    expect(account.name).toBe('Ana Souza');
    expect(account.email).toBe('ana@example.com');
  });
});

describe('Account.normalizeEmail', () => {
  it('should trim and lower-case the address', () => {
    expect(Account.normalizeEmail('  Rui@Example.com')).toBe('rui@example.com');
  });
});

describe('Account.requireActive', () => {
  it('should return an active account', () => {
    const account = Account.create({ name: 'Ana', email: 'ana@example.com' });
    account.activate();

    expect(Account.requireActive(account)).toBe(account);
  });

  it.each([accountStatuses.Pending, accountStatuses.Disabled])(
    'should refuse a %s account',
    (status) => {
      const account = Account.create({ name: 'Ana', email: 'ana@example.com' });
      account.status = status;

      expect(() => Account.requireActive(account)).toThrow(AccountUnavailable);
    },
  );

  it('should refuse a missing account', () => {
    expect(() => Account.requireActive(null)).toThrow(AccountUnavailable);
  });
});

describe('Account.activate', () => {
  it('should make the account active', () => {
    const account = Account.create({ name: 'Ana', email: 'ana@example.com' });

    account.activate();

    expect(account.status).toBe('ACTIVE');
  });
});

describe('Account.hashRefreshToken', () => {
  it('should give the same hex digest for the same token and another for another', () => {
    const hash = Account.hashRefreshToken('token-1');

    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(Account.hashRefreshToken('token-1')).toBe(hash);
    expect(Account.hashRefreshToken('token-2')).not.toBe(hash);
  });
});

describe('Account.toId', () => {
  it('should brand a KSUID and refuse anything else', () => {
    expect(Account.toId('2Wk1zbcTqPHEuTXoAXZRDcjYKKK')).toBe(
      '2Wk1zbcTqPHEuTXoAXZRDcjYKKK',
    );
    expect(Account.isId('acc-1')).toBe(false);
    expect(() => Account.toId('acc-1')).toThrow(TypeError);
  });
});
