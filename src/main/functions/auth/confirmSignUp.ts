import { ConfirmSignUpController } from '@application/controllers/auth/ConfirmSignUpController';
import { ConfirmSignUpUseCase } from '@application/usecases/auth/ConfirmSignUpUseCase';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';
import { makeAccountRepository } from '@main/factories/makeAccountRepository';
import { makeAuthGateway } from '@main/factories/makeAuthGateway';

const accountsRepository = makeAccountRepository();
const authGateway = makeAuthGateway();
const confirmSignUpUseCase = new ConfirmSignUpUseCase(
  accountsRepository,
  authGateway,
);
const controller = new ConfirmSignUpController(confirmSignUpUseCase);

export const handler = lambdaHttpAdapter(controller);
