import { defineError } from '@application/errors/shared/defineError';
import { ErrorCode } from '@application/errors/shared/ErrorCode';

export const ReviewNotFound = defineError(
  'ReviewNotFound',
  ErrorCode.ReviewNotFound,
  404,
  'You have not reviewed this course.',
);
