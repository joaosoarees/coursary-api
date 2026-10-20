import { SignUpController } from '@application/controllers/auth/SignUpController';
import { SignUpUseCase } from '@application/usecases/auth/SignUpUseCase';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';
import { makeAccountRepository } from '@main/factories/makeAccountRepository';
import { makeAuthGateway } from '@main/factories/makeAuthGateway';

const accountsRepository = makeAccountRepository();
const authGateway = makeAuthGateway();
const signUpUseCase = new SignUpUseCase(accountsRepository, authGateway);
const controller = new SignUpController(signUpUseCase);

export const handler = lambdaHttpAdapter(controller);
