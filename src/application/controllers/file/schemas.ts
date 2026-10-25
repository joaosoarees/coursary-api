import { z } from 'zod';

import { lessonParamsSchema } from '@application/controllers/enrollment/schemas';
import {
  ksuidSchema,
  uploadSchemaOf,
} from '@application/controllers/shared/schemas';
import type { File } from '@application/entities/file/File';

export const attachmentParamsSchema = lessonParamsSchema.extend({
  fileId: ksuidSchema.transform((value) => value as File.Id),
});

// Only shown and sent back as the download's name: no path, no control characters (Q408).
const fileNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(200)
  // eslint-disable-next-line no-control-regex
  .refine((name) => !/[/\\\u0000-\u001f\u007f]/.test(name), {
    message: 'Use a file name without slashes or control characters.',
  });

export const attachmentUploadSchema = uploadSchemaOf('attachment').extend({
  fileName: fileNameSchema,
});

export const reorderAttachmentsSchema = z.object({
  fileIds: z.array(ksuidSchema).max(20),
});
