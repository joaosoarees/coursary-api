import { z } from 'zod';

import { ksuidSchema } from '@application/controllers/shared/schemas';
import { StudentExport } from '@application/entities/export/StudentExport';

export const exportIdSchema = ksuidSchema.transform((value) =>
  StudentExport.toId(value),
);

export const exportIdParamsSchema = z.object({ exportId: exportIdSchema });
