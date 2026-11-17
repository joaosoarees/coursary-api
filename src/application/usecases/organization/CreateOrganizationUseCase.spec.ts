import { describe, expect, it } from 'vitest';

import { Account } from '@application/entities/account/Account';
import type { Organization } from '@application/entities/organization/Organization';
import { AccountUnavailable } from '@application/errors/auth';
import type { OrganizationRepository } from '@application/repositories/organization/OrganizationRepository';
import { CreateOrganizationUseCase } from '@application/usecases/organization/CreateOrganizationUseCase';

const setup = () => {
  const created: Organization[] = [];
  const repository: OrganizationRepository = {
    create: (organization) => {
      created.push(organization);
      return Promise.resolve();
    },
  };

  return { created, useCase: new CreateOrganizationUseCase(repository) };
};

describe('CreateOrganizationUseCase', () => {
  it('should store an organization owned by the caller and answer the owner role', async () => {
    const { created, useCase } = setup();
    const owner = Account.create({ name: 'Ana', email: 'ana@example.com' });
    owner.activate();

    const summary = await useCase.execute({ owner, name: 'Acme' });

    expect(created).toEqual([
      expect.objectContaining({ name: 'Acme', ownerId: owner.id }),
    ]);
    expect(summary).toMatchObject({
      id: created[0]?.id,
      name: 'Acme',
      role: 'OWNER',
    });
  });

  it('should refuse an account that is not active', async () => {
    const { created, useCase } = setup();
    const owner = Account.create({ name: 'Ana', email: 'ana@example.com' });

    await expect(
      useCase.execute({ owner, name: 'Acme' }),
    ).rejects.toBeInstanceOf(AccountUnavailable);
    expect(created).toEqual([]);
  });
});
