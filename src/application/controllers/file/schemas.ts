import { z } from 'zod';

import { lessonParamsSchema } from '@application/controllers/enrollment/schemas';
import {
  ksuidSchema,
  uploadSchemaOf,
} from '@application/controllers/shared/schemas';
import { File } from '@application/entities/file/File';

const fileIdSchema = ksuidSchema.transform((value) => value as File.Id);

export const attachmentParamsSchema = lessonParamsSchema.extend({
  fileId: fileIdSchema,
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

// The size is declared up front: it fixes the parts and the object S3 will accept (Q433, Q441).
export const videoUploadSchema = uploadSchemaOf('video').extend({
  size: z.number().int().min(1).max(File.ruleOf('video').maxBytes),
});

export const videoPartUrlsSchema = z.object({
  fileId: fileIdSchema,
  partNumbers: z.array(z.number().int().min(1)).min(1).max(100),
});

export const videoCompletionSchema = z.object({
  fileId: fileIdSchema,
  parts: z
    .array(
      z.object({
        partNumber: z.number().int().min(1),
        // As S3 returned it in the part's response, quotes included.
        eTag: z.string().min(1).max(100),
      }),
    )
    .min(1)
    .max(10_000),
});

export const videoUploadIdSchema = z.object({ fileId: fileIdSchema });
