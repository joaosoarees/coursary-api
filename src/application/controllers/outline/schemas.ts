import { z } from 'zod';

import {
  courseIdSchema,
  ksuidSchema,
  lessonIdSchema,
  titleSchema,
} from '@application/controllers/shared/schemas';
import { Module } from '@application/entities/outline/Module';

const moduleId = ksuidSchema.transform((value) => Module.toId(value));

const MAX_BODY_BYTES = 32 * 1024;

const bodySchema = z
  .string()
  .refine((body) => Buffer.byteLength(body, 'utf8') <= MAX_BODY_BYTES, {
    message: 'The body takes at most 32 KiB.',
  });
const durationSchema = z.number().int().min(1).max(600);

export const moduleParamsSchema = z.object({
  courseId: courseIdSchema,
  moduleId,
});

export const lessonParamsSchema = z.object({
  courseId: courseIdSchema,
  moduleId,
  lessonId: lessonIdSchema,
});

export const moduleBodySchema = z.object({ title: titleSchema });

export const createLessonSchema = z.object({
  title: titleSchema,
  body: bodySchema.default(''),
  durationMinutes: durationSchema,
});

export const updateLessonSchema = z
  .object({
    title: titleSchema.optional(),
    body: bodySchema.optional(),
    durationMinutes: durationSchema.optional(),
  })
  .refine(
    (changes) =>
      changes.title !== undefined ||
      changes.body !== undefined ||
      changes.durationMinutes !== undefined,
    { message: 'Send at least one field.' },
  );

export const outlineBodySchema = z.object({
  modules: z.array(
    z.object({ id: moduleId, lessonIds: z.array(lessonIdSchema) }),
  ),
});
