import { ForgotPasswordController } from '@application/controllers/auth/ForgotPasswordController';
import { ForgotPasswordUseCase } from '@application/usecases/auth/ForgotPasswordUseCase';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';
import { makeAccountRepository } from '@main/factories/makeAccountRepository';
import { makeAuthGateway } from '@main/factories/makeAuthGateway';

const accountsRepository = makeAccountRepository();
const authGateway = makeAuthGateway();
const forgotPasswordUseCase = new ForgotPasswordUseCase(
  accountsRepository,
  authGateway,
);
const controller = new ForgotPasswordController(forgotPasswordUseCase);

export const handler = lambdaHttpAdapter(controller);
