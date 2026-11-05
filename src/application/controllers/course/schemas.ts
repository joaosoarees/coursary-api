import { z } from 'zod';

import { fileIdSchema } from '@application/controllers/file/schemas';
import {
  courseIdSchema,
  titleSchema,
  uploadSchemaOf,
} from '@application/controllers/shared/schemas';

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

export const coverUploadSchema = uploadSchemaOf('cover');

export const coverUploadParamsSchema = z.object({
  courseId: courseIdSchema,
  fileId: fileIdSchema,
});
