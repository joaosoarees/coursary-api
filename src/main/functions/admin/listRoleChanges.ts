import { ListRoleChangesController } from '@application/controllers/admin/ListRoleChangesController';
import { ListRoleChangesUseCase } from '@application/usecases/admin/ListRoleChangesUseCase';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';
import { makeAccountRepository } from '@main/factories/makeAccountRepository';
import { makeListRoleChangesQuery } from '@main/factories/makeListRoleChangesQuery';
import { makeResolveCallerUseCase } from '@main/factories/makeResolveCallerUseCase';

const accountsRepository = makeAccountRepository();
const listRoleChangesQuery = makeListRoleChangesQuery();
const listRoleChangesUseCase = new ListRoleChangesUseCase(
  accountsRepository,
  listRoleChangesQuery,
);
const controller = new ListRoleChangesController(listRoleChangesUseCase);
const resolveCaller = makeResolveCallerUseCase();

export const handler = lambdaHttpAdapter(controller, resolveCaller);
