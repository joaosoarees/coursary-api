import { ResendConfirmationCodeController } from '@application/controllers/auth/ResendConfirmationCodeController';
import { ResendConfirmationCodeUseCase } from '@application/usecases/auth/ResendConfirmationCodeUseCase';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';
import { makeAccountRepository } from '@main/factories/makeAccountRepository';
import { makeAuthGateway } from '@main/factories/makeAuthGateway';

const accountsRepository = makeAccountRepository();
const authGateway = makeAuthGateway();
const resendConfirmationCodeUseCase = new ResendConfirmationCodeUseCase(
  accountsRepository,
  authGateway,
);
const controller = new ResendConfirmationCodeController(
  resendConfirmationCodeUseCase,
);

export const handler = lambdaHttpAdapter(controller);
