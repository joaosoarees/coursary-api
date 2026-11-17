import { ListMyOrganizationsController } from '@application/controllers/organization/ListMyOrganizationsController';
import { ListMyOrganizationsUseCase } from '@application/usecases/organization/ListMyOrganizationsUseCase';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';
import { makeListMyOrganizationsQuery } from '@main/factories/makeListMyOrganizationsQuery';
import { makeResolveCallerUseCase } from '@main/factories/makeResolveCallerUseCase';

const listMyOrganizationsQuery = makeListMyOrganizationsQuery();
const listMyOrganizationsUseCase = new ListMyOrganizationsUseCase(
  listMyOrganizationsQuery,
);
const controller = new ListMyOrganizationsController(
  listMyOrganizationsUseCase,
);
const resolveCaller = makeResolveCallerUseCase();

export const handler = lambdaHttpAdapter(controller, resolveCaller);
