import { z } from 'zod';

import {
  ksuidSchema,
  lessonIdSchema,
} from '@application/controllers/shared/schemas';
import { Question } from '@application/entities/question/Question';
import { PushLessonChangesUseCase } from '@application/usecases/realtime/PushLessonChangesUseCase';
import { sqsBatchAdapter } from '@main/adapters/sqsBatchAdapter';
import { makeRealtimeChannel } from '@main/factories/makeRealtimeChannel';
import { makeRealtimeConnectionRepository } from '@main/factories/makeRealtimeConnectionRepository';

const schema = z.object({
  lessonId: lessonIdSchema,
  questionIds: z.array(ksuidSchema.transform((value) => Question.toId(value))),
  listChanged: z.boolean(),
});
const pushLessonChangesUseCase = new PushLessonChangesUseCase(
  makeRealtimeConnectionRepository(),
  makeRealtimeChannel(),
);

export const handler = sqsBatchAdapter(schema, pushLessonChangesUseCase, {
  ordered: false,
});
