import { defineError } from '@application/errors/shared/defineError';
import { ErrorCode } from '@application/errors/shared/ErrorCode';

export const ExportPending = defineError(
  'ExportPending',
  ErrorCode.ExportPending,
  409,
  'The course already has an export being prepared.',
);

export const ExportNotFound = defineError(
  'ExportNotFound',
  ErrorCode.ExportNotFound,
  404,
  'The export does not exist.',
);
