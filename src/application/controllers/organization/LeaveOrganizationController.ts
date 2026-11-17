import type { Controller } from '@application/contracts/Controller';
import { OrgController } from '@application/contracts/OrgController';
import type { LeaveOrganizationUseCase } from '@application/usecases/organization/LeaveOrganizationUseCase';

export class LeaveOrganizationController extends OrgController {
  // The owner deletes the organization instead of leaving it.
  protected override readonly orgRoles = ['ADMIN', 'MEMBER'] as const;

  constructor(private readonly leaveOrganization: LeaveOrganizationUseCase) {
    super();
  }

  protected async handle({
    membership,
  }: Controller.Request<'org'>): Promise<Controller.Response<undefined>> {
    await this.leaveOrganization.execute({ membership });

    return { statusCode: 204 };
  }
}
