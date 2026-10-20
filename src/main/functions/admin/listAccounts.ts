import { ListAccountsController } from '@application/controllers/admin/ListAccountsController';
import { ListAccountsUseCase } from '@application/usecases/admin/ListAccountsUseCase';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';
import { makeListAccountsByRoleQuery } from '@main/factories/makeListAccountsByRoleQuery';
import { makeResolveCallerUseCase } from '@main/factories/makeResolveCallerUseCase';

const listAccountsByRoleQuery = makeListAccountsByRoleQuery();
const listAccountsUseCase = new ListAccountsUseCase(listAccountsByRoleQuery);
const controller = new ListAccountsController(listAccountsUseCase);
const resolveCaller = makeResolveCallerUseCase();

export const handler = lambdaHttpAdapter(controller, resolveCaller);
