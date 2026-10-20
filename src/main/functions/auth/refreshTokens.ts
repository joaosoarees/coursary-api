import { RefreshTokensController } from '@application/controllers/auth/RefreshTokensController';
import { RefreshTokensUseCase } from '@application/usecases/auth/RefreshTokensUseCase';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';
import { makeAccountRepository } from '@main/factories/makeAccountRepository';
import { makeAuthGateway } from '@main/factories/makeAuthGateway';

const authGateway = makeAuthGateway();
const accountsRepository = makeAccountRepository();
const refreshTokensUseCase = new RefreshTokensUseCase(
  accountsRepository,
  authGateway,
);
const controller = new RefreshTokensController(refreshTokensUseCase);

export const handler = lambdaHttpAdapter(controller);
