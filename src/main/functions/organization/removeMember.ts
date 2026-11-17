import { RemoveMemberController } from '@application/controllers/organization/RemoveMemberController';
import { RemoveMemberUseCase } from '@application/usecases/organization/RemoveMemberUseCase';
import { lambdaOrgHttpAdapter } from '@main/adapters/lambdaHttpAdapter';
import { makeMembershipRepositoryForOrg } from '@main/factories/makeMembershipRepositoryForOrg';
import { makeResolveCallerUseCase } from '@main/factories/makeResolveCallerUseCase';
import { makeResolveMembershipUseCase } from '@main/factories/makeResolveMembershipUseCase';
import { makeUnitOfWork } from '@main/factories/makeUnitOfWork';

const useCase = new RemoveMemberUseCase(
  makeMembershipRepositoryForOrg(),
  makeUnitOfWork,
);
const controller = new RemoveMemberController(useCase);
const resolveCaller = makeResolveCallerUseCase();
const resolveMembership = makeResolveMembershipUseCase();

export const handler = lambdaOrgHttpAdapter(
  controller,
  resolveCaller,
  resolveMembership,
);
