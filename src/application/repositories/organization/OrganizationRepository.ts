import type { Organization } from '@application/entities/organization/Organization';

export interface OrganizationRepository {
  create: (organization: Organization) => Promise<void>;
}
