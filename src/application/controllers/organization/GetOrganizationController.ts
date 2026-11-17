import type { Controller } from '@application/contracts/Controller';
import { OrgController } from '@application/contracts/OrgController';
import { Membership } from '@application/entities/organization/Membership';
import { OrganizationSummary } from '@application/queries/organization/OrganizationSummary';

export class GetOrganizationController extends OrgController<OrganizationSummary> {
  protected override readonly orgRoles = Membership.roles;

  protected handle({
    membership,
  }: Controller.Request<'org'>): Promise<
    Controller.Response<OrganizationSummary>
  > {
    return Promise.resolve({
      statusCode: 200,
      body: OrganizationSummary.fromMembership(membership),
    });
  }
}
