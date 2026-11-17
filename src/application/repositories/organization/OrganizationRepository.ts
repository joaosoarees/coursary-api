import type { Membership } from '@application/entities/organization/Membership';
import type { Organization } from '@application/entities/organization/Organization';

export interface OrganizationRepository {
  // The organization and its owner's membership, together or not at all.
  create: (organization: Organization, owner: Membership) => Promise<void>;
}
