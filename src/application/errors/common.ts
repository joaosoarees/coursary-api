import { defineError } from '@application/errors/shared/defineError';
import { ErrorCode } from '@application/errors/shared/ErrorCode';

export const Forbidden = defineError(
  'Forbidden',
  ErrorCode.Forbidden,
  403,
  'You are not allowed to do this.',
);

export const Conflict = defineError(
  'Conflict',
  ErrorCode.Conflict,
  409,
  'The data changed in the meantime. Try again.',
);

export const InvalidCursor = defineError(
  'InvalidCursor',
  ErrorCode.InvalidCursor,
  400,
  'The cursor is not valid for this list.',
);

export const MalformedBody = defineError(
  'MalformedBody',
  ErrorCode.BadRequest,
  400,
  'The request body is not valid JSON.',
);

export const TooManyRequests = defineError(
  'TooManyRequests',
  ErrorCode.TooManyRequests,
  429,
  'Too many attempts. Try again later.',
);
