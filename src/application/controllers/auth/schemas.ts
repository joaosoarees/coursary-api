import { z } from 'zod';

import {
  emailSchema,
  nameSchema,
} from '@application/controllers/shared/schemas';

export const passwordSchema = z
  .string()
  .min(8)
  .max(256)
  .regex(/[a-z]/, 'Must contain a lowercase letter.')
  .regex(/[0-9]/, 'Must contain a number.');

const codeSchema = z.string().regex(/^\S{1,2048}$/);

export const signUpSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export const confirmSignUpSchema = z.object({
  email: emailSchema,
  code: codeSchema,
});

export const resendConfirmationCodeSchema = z.object({ email: emailSchema });

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(256),
});

export const refreshTokensSchema = z.object({
  refreshToken: z
    .string()
    .max(8192)
    .regex(/^[A-Za-z0-9\-_=.]+$/),
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z.object({
  email: emailSchema,
  code: codeSchema,
  newPassword: passwordSchema,
});
