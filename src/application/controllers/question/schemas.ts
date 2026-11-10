import { z } from 'zod';

import { lessonParamsSchema } from '@application/controllers/enrollment/schemas';
import { ksuidSchema } from '@application/controllers/shared/schemas';
import { Answer } from '@application/entities/question/Answer';
import { Question } from '@application/entities/question/Question';

export const questionParamsSchema = lessonParamsSchema.extend({
  questionId: ksuidSchema.transform((value) => Question.toId(value)),
});

export const answerParamsSchema = questionParamsSchema.extend({
  answerId: ksuidSchema.transform((value) => Answer.toId(value)),
});

export const postSchema = z.object({
  text: z.string().trim().min(1).max(2000),
});
