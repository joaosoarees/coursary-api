import { Account } from '@application/entities/account/Account';
import { Membership } from '@application/entities/organization/Membership';
import { Organization } from '@application/entities/organization/Organization';
import { OrganizationSummary } from '@application/queries/organization/OrganizationSummary';
import type { OrganizationRepository } from '@application/repositories/organization/OrganizationRepository';

export class CreateOrganizationUseCase {
  constructor(
    private readonly organizationsRepository: OrganizationRepository,
  ) {}

  async execute({
    owner,
    name,
  }: CreateOrganizationUseCase.Input): Promise<OrganizationSummary> {
    const organization = Organization.create({
      owner: Account.requireActive(owner),
      name,
    });

    await this.organizationsRepository.create(organization);

    return OrganizationSummary.fromMembership(Membership.ownerOf(organization));
  }
}

export namespace CreateOrganizationUseCase {
  export interface Input {
    owner: Account;
    name: string;
  }
}
