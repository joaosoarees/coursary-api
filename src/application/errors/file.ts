import { defineError } from '@application/errors/shared/defineError';
import { ErrorCode } from '@application/errors/shared/ErrorCode';

export const AttachmentNotFound = defineError(
  'AttachmentNotFound',
  ErrorCode.AttachmentNotFound,
  404,
  'The material does not exist.',
);

export const AttachmentLimit = defineError(
  'AttachmentLimit',
  ErrorCode.AttachmentLimit,
  409,
  'The lesson already holds as much material as it may.',
);

export const AttachmentOrderMismatch = defineError(
  'AttachmentOrderMismatch',
  ErrorCode.AttachmentOrderMismatch,
  400,
  'The order must list every material of the lesson once.',
);
