import { Controller } from '@application/contracts/Controller';
import type { Membership } from '@application/entities/organization/Membership';
import { Forbidden } from '@application/errors/common';

// A route of one organization. Its roles are abstract, so a route that names none does not
// compile: no route is open to every role by omission.
export abstract class OrgController<TResponse = undefined> extends Controller<
  'org',
  TResponse
> {
  protected abstract readonly orgRoles: readonly [
    Membership.Role,
    ...Membership.Role[],
  ];

  override async execute(
    request: Controller.Request<'org'>,
  ): Promise<Controller.Response<TResponse>> {
    this.authorizeMember(request.membership.role);

    return super.execute(request);
  }

  // Public so an adapter can refuse a member before reading the body.
  authorizeMember(role: Membership.Role): void {
    if (!this.orgRoles.includes(role)) {
      throw new Forbidden();
    }
  }
}
