import { SignInController } from '@application/controllers/auth/SignInController';
import { SignInUseCase } from '@application/usecases/auth/SignInUseCase';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';
import { makeAccountRepository } from '@main/factories/makeAccountRepository';
import { makeAppConfig } from '@main/factories/makeAppConfig';
import { makeAuthGateway } from '@main/factories/makeAuthGateway';

const config = makeAppConfig();
const authGateway = makeAuthGateway();
const accountsRepository = makeAccountRepository();
const signInUseCase = new SignInUseCase(accountsRepository, authGateway);
const controller = new SignInController(signInUseCase, config);

export const handler = lambdaHttpAdapter(controller);
