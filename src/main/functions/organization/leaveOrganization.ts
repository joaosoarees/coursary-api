import { LeaveOrganizationController } from '@application/controllers/organization/LeaveOrganizationController';
import { LeaveOrganizationUseCase } from '@application/usecases/organization/LeaveOrganizationUseCase';
import { lambdaOrgHttpAdapter } from '@main/adapters/lambdaHttpAdapter';
import { makeMembershipRepositoryForOrg } from '@main/factories/makeMembershipRepositoryForOrg';
import { makeResolveCallerUseCase } from '@main/factories/makeResolveCallerUseCase';
import { makeResolveMembershipUseCase } from '@main/factories/makeResolveMembershipUseCase';
import { makeUnitOfWork } from '@main/factories/makeUnitOfWork';

const useCase = new LeaveOrganizationUseCase(
  makeMembershipRepositoryForOrg(),
  makeUnitOfWork,
);
const controller = new LeaveOrganizationController(useCase);
const resolveCaller = makeResolveCallerUseCase();
const resolveMembership = makeResolveMembershipUseCase();

export const handler = lambdaOrgHttpAdapter(
  controller,
  resolveCaller,
  resolveMembership,
);
