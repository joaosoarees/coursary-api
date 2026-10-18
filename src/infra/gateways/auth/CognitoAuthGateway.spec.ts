import { createHmac } from 'node:crypto';

import {
  AdminDeleteUserCommand,
  AdminGetUserCommand,
  CodeMismatchException,
  ConfirmForgotPasswordCommand,
  ConfirmSignUpCommand,
  ExpiredCodeException,
  ForgotPasswordCommand,
  GetTokensFromRefreshTokenCommand,
  InitiateAuthCommand,
  InvalidParameterException,
  InvalidPasswordException,
  LimitExceededException,
  NotAuthorizedException,
  PasswordResetRequiredException,
  RefreshTokenReuseException,
  ResendConfirmationCodeCommand,
  SignUpCommand,
  TooManyFailedAttemptsException,
  TooManyRequestsException,
  UserLambdaValidationException,
  UsernameExistsException,
  UserNotConfirmedException,
  UserNotFoundException,
} from '@aws-sdk/client-cognito-identity-provider';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Account } from '@application/entities/account/Account';
import {
  AccountUnavailable,
  AuthUserExists,
  AuthUserNotPending,
  EmailNotConfirmed,
  InvalidCode,
  InvalidCredentials,
  InvalidPassword,
  InvalidSession,
} from '@application/errors/auth';
import { TooManyRequests } from '@application/errors/common';
import { cognitoClient } from '@infra/clients/cognitoClient';
import { CognitoAuthGateway } from '@infra/gateways/auth/CognitoAuthGateway';
import { AppConfig } from '@shared/config/AppConfig';

const metadata = { $metadata: {}, message: 'from Cognito' };
const gateway = new CognitoAuthGateway(new AppConfig());
const signUpParams = {
  email: 'ana@example.com',
  password: 'secret123',
  internalId: '3KiXn2xer0YTzKh5D0ogq26ICge',
};

const send = () => vi.spyOn(cognitoClient, 'send');

const secretHashOf = (username: string) =>
  createHmac('sha256', 'client-secret')
    .update(`${username}client-id`)
    .digest('base64');

beforeEach(() => {
  vi.stubEnv('COGNITO_POOL_ID', 'sa-east-1_pool');
  vi.stubEnv('COGNITO_CLIENT_ID', 'client-id');
  vi.stubEnv('COGNITO_CLIENT_SECRET', 'client-secret');
});

describe('CognitoAuthGateway.signUp', () => {
  it('should sign the user up with the secret hash and the internal id', async () => {
    const spy = send().mockResolvedValue({ UserSub: 'sub-1' } as never);

    const result = await gateway.signUp(signUpParams);

    const command = spy.mock.calls[0]?.[0] as SignUpCommand;
    expect(command).toBeInstanceOf(SignUpCommand);
    expect(command.input).toMatchObject({
      ClientId: 'client-id',
      Username: 'ana@example.com',
      SecretHash: createHmac('sha256', 'client-secret')
        .update('ana@example.comclient-id')
        .digest('base64'),
      UserAttributes: [
        { Name: 'email', Value: 'ana@example.com' },
        { Name: 'custom:internalId', Value: signUpParams.internalId },
      ],
    });
    expect(result).toEqual({ externalId: 'sub-1' });
  });

  it.each([
    [new UsernameExistsException(metadata), AuthUserExists],
    [new InvalidPasswordException(metadata), InvalidPassword],
    [new TooManyRequestsException(metadata), TooManyRequests],
  ])('should translate %s', async (cognitoError, expected) => {
    send().mockRejectedValue(cognitoError);

    await expect(gateway.signUp(signUpParams)).rejects.toBeInstanceOf(expected);
  });

  it('should rethrow anything it does not translate', async () => {
    const unexpected = new Error('network down');
    send().mockRejectedValue(unexpected);

    await expect(gateway.signUp(signUpParams)).rejects.toBe(unexpected);
  });
});

describe('CognitoAuthGateway.deleteUnconfirmedUser', () => {
  it('should delete a user that never confirmed', async () => {
    const spy = send()
      .mockResolvedValueOnce({ UserStatus: 'UNCONFIRMED' } as never)
      .mockResolvedValueOnce({} as never);

    await expect(
      gateway.deleteUnconfirmedUser('ana@example.com'),
    ).resolves.toBe('deleted');
    expect(spy.mock.calls[1]?.[0]).toBeInstanceOf(AdminDeleteUserCommand);
  });

  it('should never delete a confirmed user', async () => {
    const spy = send().mockResolvedValue({ UserStatus: 'CONFIRMED' } as never);

    await expect(
      gateway.deleteUnconfirmedUser('ana@example.com'),
    ).resolves.toBe('confirmed');
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]?.[0]).toBeInstanceOf(AdminGetUserCommand);
  });

  it('should report a user that does not exist', async () => {
    send().mockRejectedValue(new UserNotFoundException(metadata));

    await expect(
      gateway.deleteUnconfirmedUser('ana@example.com'),
    ).resolves.toBe('not-found');
  });
});

describe('CognitoAuthGateway.deleteExpiredSignUp', () => {
  const accountId = Account.toId(signUpParams.internalId);
  const user = (status: string, internalId: string) =>
    ({
      UserStatus: status,
      UserAttributes: [
        { Name: 'email', Value: 'ana@example.com' },
        { Name: 'custom:internalId', Value: internalId },
      ],
    }) as never;

  it('should delete the unconfirmed user of that account', async () => {
    const spy = send()
      .mockResolvedValueOnce(user('UNCONFIRMED', accountId))
      .mockResolvedValueOnce({} as never);

    await expect(
      gateway.deleteExpiredSignUp({ email: 'ana@example.com', accountId }),
    ).resolves.toBe('deleted');
    expect(spy.mock.calls[1]?.[0]).toBeInstanceOf(AdminDeleteUserCommand);
  });

  it.each([
    ['another account', user('UNCONFIRMED', 'someone-else'), 'other-account'],
    ['a confirmed user', user('CONFIRMED', accountId), 'confirmed'],
  ])('should never delete %s', async (_, found, outcome) => {
    const spy = send().mockResolvedValue(found);

    await expect(
      gateway.deleteExpiredSignUp({ email: 'ana@example.com', accountId }),
    ).resolves.toBe(outcome);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('should report a user that does not exist', async () => {
    send().mockRejectedValue(new UserNotFoundException(metadata));

    await expect(
      gateway.deleteExpiredSignUp({ email: 'ana@example.com', accountId }),
    ).resolves.toBe('not-found');
  });
});

describe('CognitoAuthGateway.confirmSignUp', () => {
  it('should confirm the user with the code and the secret hash', async () => {
    const spy = send().mockResolvedValue({} as never);

    await gateway.confirmSignUp('ana@example.com', '012345');

    const command = spy.mock.calls[0]?.[0] as ConfirmSignUpCommand;
    expect(command).toBeInstanceOf(ConfirmSignUpCommand);
    expect(command.input).toEqual({
      ClientId: 'client-id',
      Username: 'ana@example.com',
      ConfirmationCode: '012345',
      SecretHash: secretHashOf('ana@example.com'),
    });
  });

  it.each([
    [new CodeMismatchException(metadata), InvalidCode],
    [new ExpiredCodeException(metadata), InvalidCode],
    [new UserNotFoundException(metadata), InvalidCode],
    [new NotAuthorizedException(metadata), AuthUserNotPending],
    [new LimitExceededException(metadata), TooManyRequests],
    [new TooManyFailedAttemptsException(metadata), TooManyRequests],
  ])('should translate %s', async (cognitoError, expected) => {
    send().mockRejectedValue(cognitoError);

    await expect(
      gateway.confirmSignUp('ana@example.com', '012345'),
    ).rejects.toBeInstanceOf(expected);
  });
});

describe('CognitoAuthGateway.resendConfirmationCode', () => {
  it('should ask for a new code with the secret hash', async () => {
    const spy = send().mockResolvedValue({} as never);

    await gateway.resendConfirmationCode('ana@example.com');

    const command = spy.mock.calls[0]?.[0] as ResendConfirmationCodeCommand;
    expect(command).toBeInstanceOf(ResendConfirmationCodeCommand);
    expect(command.input).toEqual({
      ClientId: 'client-id',
      Username: 'ana@example.com',
      SecretHash: secretHashOf('ana@example.com'),
    });
  });

  it.each([
    new UserNotFoundException(metadata),
    new InvalidParameterException(metadata),
  ])('should answer like a success on %s', async (cognitoError) => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    send().mockRejectedValue(cognitoError);

    await expect(
      gateway.resendConfirmationCode('ana@example.com'),
    ).resolves.toBeUndefined();
  });

  it('should translate the service limits', async () => {
    send().mockRejectedValue(new LimitExceededException(metadata));

    await expect(
      gateway.resendConfirmationCode('ana@example.com'),
    ).rejects.toBeInstanceOf(TooManyRequests);
  });
});

describe('CognitoAuthGateway.isUserConfirmed', () => {
  it.each([
    ['CONFIRMED', true],
    ['UNCONFIRMED', false],
  ])('should read a %s user as %s', async (UserStatus, expected) => {
    send().mockResolvedValue({ UserStatus } as never);

    await expect(gateway.isUserConfirmed('ana@example.com')).resolves.toBe(
      expected,
    );
  });

  it('should read a missing user as not confirmed', async () => {
    send().mockRejectedValue(new UserNotFoundException(metadata));

    await expect(gateway.isUserConfirmed('ana@example.com')).resolves.toBe(
      false,
    );
  });
});

const internalId = '2Wk1zbcTqPHEuTXoAXZRDcjYKKK';
const accessToken = [
  'header',
  Buffer.from(JSON.stringify({ internalId, jti: 'jti-1' })).toString(
    'base64url',
  ),
  'signature',
].join('.');
const authResult = {
  AuthenticationResult: {
    AccessToken: accessToken,
    IdToken: 'id',
    RefreshToken: 'refresh',
    ExpiresIn: 3600,
  },
};
const accountUnavailable = new UserLambdaValidationException({
  ...metadata,
  message: 'PreTokenGeneration failed with error ACCOUNT_UNAVAILABLE.',
});

describe('CognitoAuthGateway.signIn', () => {
  it('should sign in with the password flow and the secret hash, without the id token', async () => {
    const spy = send().mockResolvedValue(authResult as never);

    const tokens = await gateway.signIn({
      email: 'ana@example.com',
      password: 'secret123',
    });

    const command = spy.mock.calls[0]?.[0] as InitiateAuthCommand;
    expect(command).toBeInstanceOf(InitiateAuthCommand);
    expect(command.input).toEqual({
      ClientId: 'client-id',
      AuthFlow: 'USER_PASSWORD_AUTH',
      AuthParameters: {
        USERNAME: 'ana@example.com',
        PASSWORD: 'secret123',
        SECRET_HASH: secretHashOf('ana@example.com'),
      },
    });
    expect(tokens).toEqual({
      tokens: { accessToken, refreshToken: 'refresh', expiresIn: 3600 },
      accountId: internalId,
      accessJti: 'jti-1',
    });
  });

  it.each([
    [new NotAuthorizedException(metadata), InvalidCredentials],
    [new PasswordResetRequiredException(metadata), InvalidCredentials],
    [new UserNotFoundException(metadata), InvalidCredentials],
    [new UserNotConfirmedException(metadata), EmailNotConfirmed],
    [accountUnavailable, AccountUnavailable],
    [new TooManyRequestsException(metadata), TooManyRequests],
  ])('should translate %s', async (cognitoError, expected) => {
    send().mockRejectedValue(cognitoError);

    await expect(
      gateway.signIn({ email: 'ana@example.com', password: 'secret123' }),
    ).rejects.toBeInstanceOf(expected);
  });

  it('should not take a failure of another trigger for an unavailable account', async () => {
    const other = new UserLambdaValidationException({
      ...metadata,
      message: 'PreTokenGeneration failed with error boom.',
    });
    send().mockRejectedValue(other);

    await expect(
      gateway.signIn({ email: 'ana@example.com', password: 'secret123' }),
    ).rejects.toBe(other);
  });

  it('should fail on a challenge instead of returning no tokens', async () => {
    send().mockResolvedValue({
      ChallengeName: 'NEW_PASSWORD_REQUIRED',
    } as never);

    await expect(
      gateway.signIn({ email: 'ana@example.com', password: 'secret123' }),
    ).rejects.toThrow('NEW_PASSWORD_REQUIRED');
  });
});

describe('CognitoAuthGateway.refreshTokens', () => {
  it('should refresh with the client secret and return the rotated token', async () => {
    const spy = send().mockResolvedValue(authResult as never);

    const tokens = await gateway.refreshTokens('old-refresh');

    const command = spy.mock.calls[0]?.[0] as GetTokensFromRefreshTokenCommand;
    expect(command).toBeInstanceOf(GetTokensFromRefreshTokenCommand);
    expect(command.input).toEqual({
      ClientId: 'client-id',
      ClientSecret: 'client-secret',
      RefreshToken: 'old-refresh',
    });
    expect(tokens).toEqual({
      tokens: { accessToken, refreshToken: 'refresh', expiresIn: 3600 },
      accountId: internalId,
      accessJti: 'jti-1',
    });
  });

  it.each([
    [new NotAuthorizedException(metadata), InvalidSession],
    [new RefreshTokenReuseException(metadata), InvalidSession],
    [new UserNotFoundException(metadata), InvalidSession],
    [accountUnavailable, AccountUnavailable],
    [new LimitExceededException(metadata), TooManyRequests],
  ])('should translate %s', async (cognitoError, expected) => {
    send().mockRejectedValue(cognitoError);

    await expect(gateway.refreshTokens('old-refresh')).rejects.toBeInstanceOf(
      expected,
    );
  });
});

describe('CognitoAuthGateway.forgotPassword', () => {
  it('should ask for a reset code with the secret hash', async () => {
    const spy = send().mockResolvedValue({} as never);

    await gateway.forgotPassword('ana@example.com');

    const command = spy.mock.calls[0]?.[0] as ForgotPasswordCommand;
    expect(command).toBeInstanceOf(ForgotPasswordCommand);
    expect(command.input).toEqual({
      ClientId: 'client-id',
      Username: 'ana@example.com',
      SecretHash: secretHashOf('ana@example.com'),
    });
  });

  it.each([
    new UserNotFoundException(metadata),
    new InvalidParameterException(metadata),
    new NotAuthorizedException(metadata),
  ])('should answer like a success on %s', async (cognitoError) => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    send().mockRejectedValue(cognitoError);

    await expect(
      gateway.forgotPassword('ana@example.com'),
    ).resolves.toBeUndefined();
  });

  it('should translate the service limits', async () => {
    send().mockRejectedValue(new LimitExceededException(metadata));

    await expect(
      gateway.forgotPassword('ana@example.com'),
    ).rejects.toBeInstanceOf(TooManyRequests);
  });
});

describe('CognitoAuthGateway.resetPassword', () => {
  const params = {
    email: 'ana@example.com',
    code: '012345',
    newPassword: 'newsecret1',
  };

  it('should set the new password with the code and the secret hash', async () => {
    const spy = send().mockResolvedValue({} as never);

    await gateway.resetPassword(params);

    const command = spy.mock.calls[0]?.[0] as ConfirmForgotPasswordCommand;
    expect(command).toBeInstanceOf(ConfirmForgotPasswordCommand);
    expect(command.input).toEqual({
      ClientId: 'client-id',
      Username: 'ana@example.com',
      ConfirmationCode: '012345',
      Password: 'newsecret1',
      SecretHash: secretHashOf('ana@example.com'),
    });
  });

  it.each([
    [new CodeMismatchException(metadata), InvalidCode],
    [new ExpiredCodeException(metadata), InvalidCode],
    [new UserNotFoundException(metadata), InvalidCode],
    [new UserNotConfirmedException(metadata), InvalidCode],
    [new NotAuthorizedException(metadata), InvalidCode],
    [new InvalidPasswordException(metadata), InvalidPassword],
    [new TooManyFailedAttemptsException(metadata), TooManyRequests],
  ])('should translate %s', async (cognitoError, expected) => {
    send().mockRejectedValue(cognitoError);

    await expect(gateway.resetPassword(params)).rejects.toBeInstanceOf(
      expected,
    );
  });
});
