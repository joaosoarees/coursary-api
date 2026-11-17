import { z } from 'zod';

import { ksuidSchema } from '@application/controllers/shared/schemas';
import { Account } from '@application/entities/account/Account';
import { Membership } from '@application/entities/organization/Membership';
import { Organization } from '@application/entities/organization/Organization';

const orgIdSchema = ksuidSchema.transform((value) => Organization.toId(value));

export const orgIdParamsSchema = z.object({ orgId: orgIdSchema });

export const memberParamsSchema = z.object({
  orgId: orgIdSchema,
  accountId: ksuidSchema.transform((value) => Account.toId(value)),
});

export const changeMemberRoleSchema = z.object({
  role: z.enum(Membership.grantableRoles),
});

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(2).max(80),
});
