import { z } from 'zod';

import {
  courseIdSchema,
  lessonIdSchema,
} from '@application/controllers/shared/schemas';

export const lessonParamsSchema = z.object({
  courseId: courseIdSchema,
  lessonId: lessonIdSchema,
});

export const savePositionSchema = z.object({
  lessonId: lessonIdSchema,
  positionSeconds: z.number().int().min(0).max(86_400),
});
