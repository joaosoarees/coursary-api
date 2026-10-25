import { z } from 'zod';

import {
  nameSchema,
  uploadSchemaOf,
} from '@application/controllers/shared/schemas';

export const updateMeSchema = z.object({ name: nameSchema });

export const avatarUploadSchema = uploadSchemaOf('avatar');
