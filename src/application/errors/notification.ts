import { defineError } from '@application/errors/shared/defineError';
import { ErrorCode } from '@application/errors/shared/ErrorCode';

export const NotificationNotFound = defineError(
  'NotificationNotFound',
  ErrorCode.NotificationNotFound,
  404,
  'The notification was not found in your inbox.',
);
