import { defineError } from '@application/errors/shared/defineError';
import { ErrorCode } from '@application/errors/shared/ErrorCode';

export const AccountUnavailable = defineError(
  'AccountUnavailable',
  ErrorCode.AccountUnavailable,
  403,
  'This account is not available.',
);

export const EmailInUse = defineError(
  'EmailInUse',
  ErrorCode.EmailInUse,
  409,
  'This e-mail address is already registered.',
);

export const EmailNotConfirmed = defineError(
  'EmailNotConfirmed',
  ErrorCode.EmailNotConfirmed,
  403,
  'Confirm your e-mail address before signing in.',
);

export const InvalidCode = defineError(
  'InvalidCode',
  ErrorCode.InvalidCode,
  400,
  'The code is wrong or has expired. Request a new one.',
);

export const InvalidCredentials = defineError(
  'InvalidCredentials',
  ErrorCode.InvalidCredentials,
  401,
  'Incorrect e-mail or password.',
);

export const InvalidPassword = defineError(
  'InvalidPassword',
  ErrorCode.InvalidPassword,
  400,
  'The password does not meet the password policy.',
);

export const InvalidSession = defineError(
  'InvalidSession',
  ErrorCode.InvalidSession,
  401,
  'The session is not valid. Sign in again.',
);

// Signals between the identity gateway and the use cases; never answered as such.
export class AuthUserExists extends Error {
  constructor(readonly email: string) {
    super('The identity provider already has a user with this e-mail.');
    this.name = 'AuthUserExists';
  }
}

export class AuthUserNotPending extends Error {
  constructor(readonly email: string) {
    super('The identity provider has no user waiting for this confirmation.');
    this.name = 'AuthUserNotPending';
  }
}
