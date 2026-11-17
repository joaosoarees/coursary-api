import { defineError } from '@application/errors/shared/defineError';
import { ErrorCode } from '@application/errors/shared/ErrorCode';

// The same answer whether the organization exists or not, so it tells a non-member nothing.
export const NotAMember = defineError(
  'NotAMember',
  ErrorCode.NotAMember,
  403,
  'You are not a member of this organization.',
);
