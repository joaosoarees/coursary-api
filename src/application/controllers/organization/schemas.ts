import { z } from 'zod';

import { ksuidSchema } from '@application/controllers/shared/schemas';
import { Organization } from '@application/entities/organization/Organization';

export const orgIdParamsSchema = z.object({
  orgId: ksuidSchema.transform((value) => Organization.toId(value)),
});

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(2).max(80),
});
