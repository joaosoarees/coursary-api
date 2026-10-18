import { z } from 'zod';

import { emailSchema } from '@application/controllers/shared/schemas';
import { Account } from '@application/entities/account/Account';
import { KSUID_PATTERN } from '@application/entities/shared/ksuid';
import { CleanUpExpiredSignUpUseCase } from '@application/usecases/auth/CleanUpExpiredSignUpUseCase';
import { sqsBatchAdapter } from '@main/adapters/sqsBatchAdapter';
import { makeAuthGateway } from '@main/factories/makeAuthGateway';

const schema = z.object({
  accountId: z
    .string()
    .regex(KSUID_PATTERN)
    .transform((value) => Account.toId(value)),
  email: emailSchema,
});
const authGateway = makeAuthGateway();
const cleanUpExpiredSignUpUseCase = new CleanUpExpiredSignUpUseCase(
  authGateway,
);

export const handler = sqsBatchAdapter(schema, cleanUpExpiredSignUpUseCase);
