import { z } from 'zod';

import { titleSchema } from '@application/controllers/shared/schemas';

const descriptionSchema = z.string().max(5000);

export const createCourseSchema = z.object({
  title: titleSchema,
  description: descriptionSchema.default(''),
});

export const updateCourseSchema = z
  .object({
    title: titleSchema.optional(),
    description: descriptionSchema.optional(),
  })
  .refine(
    (changes) =>
      changes.title !== undefined || changes.description !== undefined,
    { message: 'Send a title, a description or both.' },
  );
