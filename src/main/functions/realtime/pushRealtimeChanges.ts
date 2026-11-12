import { z } from 'zod';

import {
  ksuidSchema,
  lessonIdSchema,
} from '@application/controllers/shared/schemas';
import { Account } from '@application/entities/account/Account';
import { Question } from '@application/entities/question/Question';
import type { RealtimeQueue } from '@application/gateways/realtime/RealtimeQueue';
import { PushRealtimeChangesUseCase } from '@application/usecases/realtime/PushRealtimeChangesUseCase';
import { sqsBatchAdapter } from '@main/adapters/sqsBatchAdapter';
import { makeRealtimeChannel } from '@main/factories/makeRealtimeChannel';
import { makeRealtimeConnectionRepository } from '@main/factories/makeRealtimeConnectionRepository';

const schema: z.ZodType<RealtimeQueue.Change> = z.union([
  z.object({
    lessonId: lessonIdSchema,
    questionIds: z.array(
      ksuidSchema.transform((value) => Question.toId(value)),
    ),
    listChanged: z.boolean(),
  }),
  z.object({
    accountIds: z.array(ksuidSchema.transform((value) => Account.toId(value))),
  }),
]);
const pushRealtimeChangesUseCase = new PushRealtimeChangesUseCase(
  makeRealtimeConnectionRepository(),
  makeRealtimeChannel(),
);

export const handler = sqsBatchAdapter(schema, pushRealtimeChangesUseCase, {
  ordered: false,
});
