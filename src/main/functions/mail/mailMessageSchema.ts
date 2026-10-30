import { z } from 'zod';

import { courseIdSchema } from '@application/controllers/shared/schemas';
import { Account } from '@application/entities/account/Account';
import { KSUID_PATTERN } from '@application/entities/shared/ksuid';
import type { MailQueue } from '@application/gateways/mail/MailQueue';

const accountIdSchema = z
  .string()
  .regex(KSUID_PATTERN)
  .transform((value) => Account.toId(value));

export const mailMessageSchema: z.ZodType<MailQueue.Request> =
  z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('welcome'), accountId: accountIdSchema }),
    z.object({
      kind: z.literal('course-archived-fanout'),
      courseId: courseIdSchema,
      cursor: z.string().min(1).optional(),
    }),
    z.object({
      kind: z.literal('course-archived'),
      courseId: courseIdSchema,
      accountId: accountIdSchema,
    }),
  ]);
