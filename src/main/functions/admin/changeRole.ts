import { ChangeRoleController } from '@application/controllers/admin/ChangeRoleController';
import { ChangeRoleUseCase } from '@application/usecases/admin/ChangeRoleUseCase';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';
import { makeAccountRepository } from '@main/factories/makeAccountRepository';
import { makeResolveCallerUseCase } from '@main/factories/makeResolveCallerUseCase';

const accountsRepository = makeAccountRepository();
const changeRoleUseCase = new ChangeRoleUseCase(accountsRepository);
const controller = new ChangeRoleController(changeRoleUseCase);
const resolveCaller = makeResolveCallerUseCase();

export const handler = lambdaHttpAdapter(controller, resolveCaller);
