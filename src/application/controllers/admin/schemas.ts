import { z } from 'zod';

import {
  emailSchema,
  ksuidSchema,
  paginationSchema,
} from '@application/controllers/shared/schemas';
import {
  Account,
  accountRoles,
  accountStatuses,
} from '@application/entities/account/Account';

export const accountIdParamsSchema = z.object({
  accountId: ksuidSchema.transform((value) => Account.toId(value)),
});

export const changeRoleSchema = z.object({ role: z.enum(accountRoles) });

export const listAccountsSchema = paginationSchema.extend({
  role: z.enum(accountRoles),
  status: z.enum(accountStatuses).optional(),
});

export const findAccountByEmailSchema = z.object({ email: emailSchema });
