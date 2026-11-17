import { CreateOrganizationController } from '@application/controllers/organization/CreateOrganizationController';
import { CreateOrganizationUseCase } from '@application/usecases/organization/CreateOrganizationUseCase';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';
import { makeOrganizationRepository } from '@main/factories/makeOrganizationRepository';
import { makeResolveCallerUseCase } from '@main/factories/makeResolveCallerUseCase';

const organizationsRepository = makeOrganizationRepository();
const createOrganizationUseCase = new CreateOrganizationUseCase(
  organizationsRepository,
);
const controller = new CreateOrganizationController(createOrganizationUseCase);
const resolveCaller = makeResolveCallerUseCase();

export const handler = lambdaHttpAdapter(controller, resolveCaller);
