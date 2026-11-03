import { z } from 'zod';

import { fileIdSchema } from '@application/controllers/file/schemas';
import {
  nameSchema,
  uploadSchemaOf,
} from '@application/controllers/shared/schemas';

export const updateMeSchema = z.object({ name: nameSchema });

export const avatarUploadSchema = uploadSchemaOf('avatar');

export const avatarUploadParamsSchema = z.object({ fileId: fileIdSchema });
