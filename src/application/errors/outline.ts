import { defineError } from '@application/errors/shared/defineError';
import { ErrorCode } from '@application/errors/shared/ErrorCode';

export const ModuleNotFound = defineError(
  'ModuleNotFound',
  ErrorCode.ModuleNotFound,
  404,
  'The module does not exist.',
);

export const LessonNotFound = defineError(
  'LessonNotFound',
  ErrorCode.LessonNotFound,
  404,
  'The lesson does not exist.',
);

export const ModuleNotEmpty = defineError(
  'ModuleNotEmpty',
  ErrorCode.ModuleNotEmpty,
  409,
  'Delete the lessons of the module first.',
);

export const OutlineMismatch = defineError(
  'OutlineMismatch',
  ErrorCode.OutlineMismatch,
  400,
  'The outline must list every module and lesson of the course once.',
);

export const OutlineTooLarge = defineError(
  'OutlineTooLarge',
  ErrorCode.OutlineTooLarge,
  400,
  'The outline moves too many items at once.',
);
