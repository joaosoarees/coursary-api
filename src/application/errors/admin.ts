import { defineError } from '@application/errors/shared/defineError';
import { ErrorCode } from '@application/errors/shared/ErrorCode';

export const CannotChangeOwnRole = defineError(
  'CannotChangeOwnRole',
  ErrorCode.CannotChangeOwnRole,
  403,
  'You cannot change your own role.',
);

export const CannotChangeOwnStatus = defineError(
  'CannotChangeOwnStatus',
  ErrorCode.CannotChangeOwnStatus,
  403,
  'You cannot change the status of your own account.',
);
