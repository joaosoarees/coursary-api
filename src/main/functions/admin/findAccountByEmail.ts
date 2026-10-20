import { FindAccountByEmailController } from '@application/controllers/admin/FindAccountByEmailController';
import { FindAccountByEmailUseCase } from '@application/usecases/admin/FindAccountByEmailUseCase';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';
import { makeAccountRepository } from '@main/factories/makeAccountRepository';
import { makeResolveCallerUseCase } from '@main/factories/makeResolveCallerUseCase';

const accountsRepository = makeAccountRepository();
const findAccountByEmailUseCase = new FindAccountByEmailUseCase(
  accountsRepository,
);
const controller = new FindAccountByEmailController(findAccountByEmailUseCase);
const resolveCaller = makeResolveCallerUseCase();

export const handler = lambdaHttpAdapter(controller, resolveCaller);
