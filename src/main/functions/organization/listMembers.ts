import { ListMembersController } from '@application/controllers/organization/ListMembersController';
import { ListMembersUseCase } from '@application/usecases/organization/ListMembersUseCase';
import { lambdaOrgHttpAdapter } from '@main/adapters/lambdaHttpAdapter';
import { makeListMembersQuery } from '@main/factories/makeListMembersQuery';
import { makeResolveCallerUseCase } from '@main/factories/makeResolveCallerUseCase';
import { makeResolveMembershipUseCase } from '@main/factories/makeResolveMembershipUseCase';

const useCase = new ListMembersUseCase(makeListMembersQuery());
const controller = new ListMembersController(useCase);
const resolveCaller = makeResolveCallerUseCase();
const resolveMembership = makeResolveMembershipUseCase();

export const handler = lambdaOrgHttpAdapter(
  controller,
  resolveCaller,
  resolveMembership,
);
