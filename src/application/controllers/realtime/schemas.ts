import { z } from 'zod';

import {
  courseIdSchema,
  lessonIdSchema,
} from '@application/controllers/shared/schemas';

// A lesson's course and id together, or neither for a connection that only hears the account.
export const ticketBodySchema = z
  .object({
    courseId: courseIdSchema.optional(),
    lessonId: lessonIdSchema.optional(),
  })
  .refine(
    ({ courseId, lessonId }) =>
      (courseId === undefined) === (lessonId === undefined),
    { message: 'courseId and lessonId go together.' },
  )
  .transform(({ courseId, lessonId }) => ({
    lesson: courseId && lessonId ? { courseId, lessonId } : undefined,
  }));
