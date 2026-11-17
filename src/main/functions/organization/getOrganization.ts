import { GetOrganizationController } from '@application/controllers/organization/GetOrganizationController';
import { lambdaOrgHttpAdapter } from '@main/adapters/lambdaHttpAdapter';
import { makeResolveCallerUseCase } from '@main/factories/makeResolveCallerUseCase';
import { makeResolveMembershipUseCase } from '@main/factories/makeResolveMembershipUseCase';

const controller = new GetOrganizationController();
const resolveCaller = makeResolveCallerUseCase();
const resolveMembership = makeResolveMembershipUseCase();

export const handler = lambdaOrgHttpAdapter(
  controller,
  resolveCaller,
  resolveMembership,
);
