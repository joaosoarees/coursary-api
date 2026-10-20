import { z } from 'zod';

import { CleanUpExpiredSignUpUseCase } from '@application/usecases/auth/CleanUpExpiredSignUpUseCase';
import { SweepUnconfirmedUsersUseCase } from '@application/usecases/auth/SweepUnconfirmedUsersUseCase';
import { lambdaInvokeAdapter } from '@main/adapters/lambdaInvokeAdapter';
import { makeAccountRepository } from '@main/factories/makeAccountRepository';
import { makeAuthGateway } from '@main/factories/makeAuthGateway';

// Takes no input; `sls invoke` may send none at all.
const schema = z.unknown();
const authGateway = makeAuthGateway();
const accountsRepository = makeAccountRepository();
const sweepUnconfirmedUsersUseCase = new SweepUnconfirmedUsersUseCase(
  authGateway,
  accountsRepository,
  new CleanUpExpiredSignUpUseCase(authGateway),
);

export const handler = lambdaInvokeAdapter(
  schema,
  sweepUnconfirmedUsersUseCase,
);
