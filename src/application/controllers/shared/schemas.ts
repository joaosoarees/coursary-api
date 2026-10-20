import { z } from 'zod';

import { Course } from '@application/entities/course/Course';
import { Lesson } from '@application/entities/outline/Lesson';
import { KSUID_PATTERN } from '@application/entities/shared/ksuid';

export const ksuidSchema = z.string().regex(KSUID_PATTERN);

export const courseIdSchema = ksuidSchema.transform((value) =>
  Course.toId(value),
);

export const lessonIdSchema = ksuidSchema.transform((value) =>
  Lesson.toId(value),
);

export const courseIdParamsSchema = z.object({ courseId: courseIdSchema });

export const emailSchema = z.string().trim().pipe(z.email().max(254));

export const nameSchema = z.string().trim().min(1).max(100);

export const titleSchema = z.string().trim().min(3).max(120);

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().min(1).optional(),
});
