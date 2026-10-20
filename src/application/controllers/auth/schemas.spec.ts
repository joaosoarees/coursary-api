import { describe, expect, it } from 'vitest';

import {
  confirmSignUpSchema,
  refreshTokensSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from '@application/controllers/auth/schemas';

const validSignUp = {
  name: 'Ana',
  email: 'ana@example.com',
  password: 'secret123',
};

describe('signUpSchema', () => {
  it('should accept a name, an e-mail and a password within the policy', () => {
    expect(signUpSchema.parse(validSignUp)).toEqual(validSignUp);
  });

  it('should trim the e-mail before validating it', () => {
    expect(
      signUpSchema.parse({ ...validSignUp, email: ' ana@example.com ' }).email,
    ).toBe('ana@example.com');
  });

  it.each([
    ['a short password', { password: 'abc1' }],
    ['a password without a number', { password: 'secretpass' }],
    ['a password without a lowercase letter', { password: 'SECRET123' }],
    ['an invalid e-mail', { email: 'ana' }],
    ['a blank name', { name: '   ' }],
  ])('should refuse %s', (_, change) => {
    expect(signUpSchema.safeParse({ ...validSignUp, ...change }).success).toBe(
      false,
    );
  });
});

const validConfirmSignUp = { email: 'ana@example.com', code: '012345' };

describe('confirmSignUpSchema', () => {
  it('should keep the code as text, leading zero included', () => {
    expect(confirmSignUpSchema.parse(validConfirmSignUp)).toEqual(
      validConfirmSignUp,
    );
  });

  it.each([
    ['a blank code', { code: '' }],
    ['a code with spaces', { code: '012 345' }],
    ['a numeric code', { code: 12345 }],
    ['an invalid e-mail', { email: 'ana' }],
  ])('should refuse %s', (_, change) => {
    expect(
      confirmSignUpSchema.safeParse({ ...validConfirmSignUp, ...change })
        .success,
    ).toBe(false);
  });
});

describe('signInSchema', () => {
  it('should not apply the password policy to a sign-in', () => {
    expect(
      signInSchema.safeParse({ email: 'ana@example.com', password: 'x' })
        .success,
    ).toBe(true);
  });

  it('should refuse an empty password', () => {
    expect(
      signInSchema.safeParse({ email: 'ana@example.com', password: '' })
        .success,
    ).toBe(false);
  });
});

describe('refreshTokensSchema', () => {
  it('should accept a token in the characters Cognito uses', () => {
    expect(
      refreshTokensSchema.safeParse({ refreshToken: 'eyJ.a-b_c=' }).success,
    ).toBe(true);
  });

  it('should refuse anything else', () => {
    expect(refreshTokensSchema.safeParse({ refreshToken: 'a b' }).success).toBe(
      false,
    );
  });
});

const validResetPassword = {
  email: 'ana@example.com',
  code: '012345',
  newPassword: 'newsecret1',
};

describe('resetPasswordSchema', () => {
  it('should accept a code and a new password within the policy', () => {
    expect(resetPasswordSchema.parse(validResetPassword)).toEqual(
      validResetPassword,
    );
  });

  it.each([
    ['a new password without a number', { newPassword: 'newsecret' }],
    ['a short new password', { newPassword: 'abc1' }],
    ['a blank code', { code: '' }],
  ])('should refuse %s', (_, change) => {
    expect(
      resetPasswordSchema.safeParse({ ...validResetPassword, ...change })
        .success,
    ).toBe(false);
  });
});
