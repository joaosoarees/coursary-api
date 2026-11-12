import { z } from 'zod';

import { ksuidSchema } from '@application/controllers/shared/schemas';
import { Notification } from '@application/entities/notification/Notification';

export const notificationParamsSchema = z.object({
  notificationId: ksuidSchema.transform((value) => Notification.toId(value)),
});
