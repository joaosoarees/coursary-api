import { z } from 'zod';

import { nameSchema } from '@application/controllers/shared/schemas';
import { File } from '@application/entities/file/File';

export const updateMeSchema = z.object({ name: nameSchema });

// The types the avatar accepts (Q379); the signed POST binds the one chosen.
export const avatarUploadSchema = z.object({
  contentType: z
    .string()
    .refine((type) => File.ruleOf('avatar').contentTypes.includes(type), {
      message: `Use one of ${File.ruleOf('avatar').contentTypes.join(', ')}.`,
    }),
});
