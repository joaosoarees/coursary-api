import { z } from 'zod';

import {
  courseIdSchema,
  ksuidSchema,
  lessonIdSchema,
} from '@application/controllers/shared/schemas';
import { Answer } from '@application/entities/question/Answer';
import { Question } from '@application/entities/question/Question';
import type { NotificationQueue } from '@application/gateways/notification/NotificationQueue';

const questionIdSchema = ksuidSchema.transform((value) => Question.toId(value));
const occurredAtSchema = z.iso.datetime();

export const notificationMessageSchema: z.ZodType<NotificationQueue.Request> =
  z.discriminatedUnion('kind', [
    z.object({
      kind: z.literal('answer'),
      lessonId: lessonIdSchema,
      questionId: questionIdSchema,
      answerId: ksuidSchema.transform((value) => Answer.toId(value)),
    }),
    z.object({
      kind: z.literal('question'),
      lessonId: lessonIdSchema,
      questionId: questionIdSchema,
    }),
    z.object({
      kind: z.literal('lesson'),
      courseId: courseIdSchema,
      lessonId: lessonIdSchema,
      occurredAt: occurredAtSchema,
      cursor: z.string().min(1).optional(),
    }),
    z.object({
      kind: z.literal('archived'),
      courseId: courseIdSchema,
      occurredAt: occurredAtSchema,
      cursor: z.string().min(1).optional(),
    }),
  ]);
