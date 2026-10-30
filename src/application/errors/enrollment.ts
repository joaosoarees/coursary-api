import { defineError } from '@application/errors/shared/defineError';
import { ErrorCode } from '@application/errors/shared/ErrorCode';

export const OwnCourse = defineError(
  'OwnCourse',
  ErrorCode.OwnCourse,
  409,
  'An instructor cannot enroll in their own course.',
);

export const EnrollmentNotFound = defineError(
  'EnrollmentNotFound',
  ErrorCode.EnrollmentNotFound,
  404,
  'You are not enrolled in this course.',
);

export const AlreadyCompleted = defineError(
  'AlreadyCompleted',
  ErrorCode.AlreadyCompleted,
  409,
  'The lesson was already completed.',
);
