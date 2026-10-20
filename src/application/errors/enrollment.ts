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

// Raised by the completion write; the use case answers it as already done (Q278).
export const AlreadyCompleted = defineError(
  'AlreadyCompleted',
  ErrorCode.AlreadyCompleted,
  409,
  'The lesson was already completed.',
);
