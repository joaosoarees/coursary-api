import { defineError } from '@application/errors/shared/defineError';
import { ErrorCode } from '@application/errors/shared/ErrorCode';

export const CourseNotFound = defineError(
  'CourseNotFound',
  ErrorCode.CourseNotFound,
  404,
  'The course does not exist.',
);

export const CourseArchived = defineError(
  'CourseArchived',
  ErrorCode.CourseArchived,
  409,
  'An archived course cannot be changed.',
);

export const CoursePublished = defineError(
  'CoursePublished',
  ErrorCode.CoursePublished,
  409,
  'A published course keeps its modules and lessons.',
);

export const CourseEmpty = defineError(
  'CourseEmpty',
  ErrorCode.CourseEmpty,
  409,
  'A course needs at least one lesson to be published.',
);

export const CourseNotPublished = defineError(
  'CourseNotPublished',
  ErrorCode.CourseNotPublished,
  409,
  'Only a published course can be archived.',
);

export const CourseNotDraft = defineError(
  'CourseNotDraft',
  ErrorCode.CourseNotDraft,
  409,
  'Only a course in draft can be deleted.',
);
