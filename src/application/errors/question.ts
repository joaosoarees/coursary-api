import { defineError } from '@application/errors/shared/defineError';
import { ErrorCode } from '@application/errors/shared/ErrorCode';

export const QuestionNotFound = defineError(
  'QuestionNotFound',
  ErrorCode.QuestionNotFound,
  404,
  'The question was not found in this lesson.',
);

export const QuestionRemoved = defineError(
  'QuestionRemoved',
  ErrorCode.QuestionRemoved,
  409,
  'The question was removed and takes no more answers.',
);

export const AnswerNotFound = defineError(
  'AnswerNotFound',
  ErrorCode.AnswerNotFound,
  404,
  'The answer was not found in this question.',
);
