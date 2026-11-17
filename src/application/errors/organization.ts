import { defineError } from '@application/errors/shared/defineError';
import { ErrorCode } from '@application/errors/shared/ErrorCode';

// The same answer whether the organization exists or not, so it tells a non-member nothing.
export const NotAMember = defineError(
  'NotAMember',
  ErrorCode.NotAMember,
  403,
  'You are not a member of this organization.',
);

// Also for an account of another organization: the id proves nothing about it.
export const MemberNotFound = defineError(
  'MemberNotFound',
  ErrorCode.MemberNotFound,
  404,
  'This account is not a member of this organization.',
);
