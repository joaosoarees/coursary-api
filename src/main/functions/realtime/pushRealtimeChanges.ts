import { z } from 'zod';

import {
  courseIdSchema,
  ksuidSchema,
  lessonIdSchema,
} from '@application/controllers/shared/schemas';
import { Account } from '@application/entities/account/Account';
import { Question } from '@application/entities/question/Question';
import type { RealtimeQueue } from '@application/gateways/realtime/RealtimeQueue';
import { PushRealtimeChangesUseCase } from '@application/usecases/realtime/PushRealtimeChangesUseCase';
import { sqsBatchAdapter } from '@main/adapters/sqsBatchAdapter';
import { makeApiGatewayRealtimeConnections } from '@main/factories/makeApiGatewayRealtimeConnections';
import { makeRealtimeChannel } from '@main/factories/makeRealtimeChannel';
import { makeRealtimeConnectionRepository } from '@main/factories/makeRealtimeConnectionRepository';

const accountIdSchema = ksuidSchema.transform((value) => Account.toId(value));

const schema: z.ZodType<RealtimeQueue.Change> = z.union([
  z.object({
    lessonId: lessonIdSchema,
    questionIds: z.array(
      ksuidSchema.transform((value) => Question.toId(value)),
    ),
    listChanged: z.boolean(),
  }),
  z.object({
    accountIds: z.array(accountIdSchema),
  }),
  z.object({
    closeAccount: z.object({
      accountId: accountIdSchema,
      courseId: courseIdSchema.optional(),
      openedBefore: z.iso
        .datetime()
        .transform((value) => new Date(value))
        .optional(),
    }),
  }),
  z.object({ closeLesson: lessonIdSchema }),
]);
const pushRealtimeChangesUseCase = new PushRealtimeChangesUseCase(
  makeRealtimeConnectionRepository(),
  makeRealtimeChannel(),
  makeApiGatewayRealtimeConnections(),
);

export const handler = sqsBatchAdapter(schema, pushRealtimeChangesUseCase, {
  ordered: false,
});
