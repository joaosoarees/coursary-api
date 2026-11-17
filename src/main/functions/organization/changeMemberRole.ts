import { ChangeMemberRoleController } from '@application/controllers/organization/ChangeMemberRoleController';
import { ChangeMemberRoleUseCase } from '@application/usecases/organization/ChangeMemberRoleUseCase';
import { lambdaOrgHttpAdapter } from '@main/adapters/lambdaHttpAdapter';
import { makeMembershipRepositoryForOrg } from '@main/factories/makeMembershipRepositoryForOrg';
import { makeResolveCallerUseCase } from '@main/factories/makeResolveCallerUseCase';
import { makeResolveMembershipUseCase } from '@main/factories/makeResolveMembershipUseCase';
import { makeUnitOfWork } from '@main/factories/makeUnitOfWork';

const useCase = new ChangeMemberRoleUseCase(
  makeMembershipRepositoryForOrg(),
  makeUnitOfWork,
);
const controller = new ChangeMemberRoleController(useCase);
const resolveCaller = makeResolveCallerUseCase();
const resolveMembership = makeResolveMembershipUseCase();

export const handler = lambdaOrgHttpAdapter(
  controller,
  resolveCaller,
  resolveMembership,
);
