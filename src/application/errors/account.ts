import { defineError } from '@application/errors/shared/defineError';
import { ErrorCode } from '@application/errors/shared/ErrorCode';

export const AccountNotFound = defineError(
  'AccountNotFound',
  ErrorCode.AccountNotFound,
  404,
  'The account does not exist.',
);

export const AccountNotActive = defineError(
  'AccountNotActive',
  ErrorCode.AccountNotActive,
  409,
  'The account is not active.',
);

export const AccountConflict = defineError(
  'AccountConflict',
  ErrorCode.Conflict,
  409,
  'The account changed in the meantime. Try again.',
);
