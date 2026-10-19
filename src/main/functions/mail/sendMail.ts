import { z } from 'zod';

import { Account } from '@application/entities/account/Account';
import { KSUID_PATTERN } from '@application/entities/shared/ksuid';
import { OnceMailer } from '@application/usecases/mail/OnceMailer';
import { SendWelcomeEmailUseCase } from '@application/usecases/mail/SendWelcomeEmailUseCase';
import { sqsBatchAdapter } from '@main/adapters/sqsBatchAdapter';
import { makeAccountRepository } from '@main/factories/makeAccountRepository';
import { makeMailGateway } from '@main/factories/makeMailGateway';
import { makeMailTemplates } from '@main/factories/makeMailTemplates';
import { makeSentMailRepository } from '@main/factories/makeSentMailRepository';

// One consumer for the mail queue; each kind of e-mail is one use case (Q349).
const schema = z.object({
  kind: z.literal('welcome'),
  accountId: z
    .string()
    .regex(KSUID_PATTERN)
    .transform((value) => Account.toId(value)),
});
const sendWelcomeEmailUseCase = new SendWelcomeEmailUseCase(
  makeAccountRepository(),
  makeMailTemplates(),
  new OnceMailer(makeSentMailRepository(), makeMailGateway()),
);

export const handler = sqsBatchAdapter(schema, sendWelcomeEmailUseCase, {
  ordered: false,
});
