import { z } from 'zod';

import { emailSchema } from '@application/controllers/shared/schemas';
import { PromoteFirstAdminUseCase } from '@application/usecases/admin/PromoteFirstAdminUseCase';
import { lambdaInvokeAdapter } from '@main/adapters/lambdaInvokeAdapter';
import { makeAccountRepository } from '@main/factories/makeAccountRepository';

const schema = z.object({ email: emailSchema });
const accountsRepository = makeAccountRepository();
const promoteFirstAdminUseCase = new PromoteFirstAdminUseCase(
  accountsRepository,
);

export const handler = lambdaInvokeAdapter(schema, promoteFirstAdminUseCase);
