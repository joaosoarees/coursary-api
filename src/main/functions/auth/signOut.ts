import { SignOutController } from '@application/controllers/auth/SignOutController';
import { SignOutUseCase } from '@application/usecases/auth/SignOutUseCase';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';
import { makeAccountRepository } from '@main/factories/makeAccountRepository';
import { makeAuthGateway } from '@main/factories/makeAuthGateway';
import { makeRealtimeConnections } from '@main/factories/makeRealtimeConnections';
import { makeResolveCallerUseCase } from '@main/factories/makeResolveCallerUseCase';

const authGateway = makeAuthGateway();
const accountsRepository = makeAccountRepository();
const signOutUseCase = new SignOutUseCase(
  accountsRepository,
  authGateway,
  makeRealtimeConnections(),
);
const controller = new SignOutController(signOutUseCase);
const resolveCaller = makeResolveCallerUseCase();

export const handler = lambdaHttpAdapter(controller, resolveCaller);
