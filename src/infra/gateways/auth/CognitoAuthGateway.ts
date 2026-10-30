import { createHmac } from 'node:crypto';

import {
  AdminDeleteUserCommand,
  AdminGetUserCommand,
  type AuthenticationResultType,
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
  ListUsersCommand,
  NotAuthorizedException,
  PasswordResetRequiredException,
  RefreshTokenReuseException,
  ResendConfirmationCodeCommand,
  RevokeTokenCommand,
  SignUpCommand,
  TooManyFailedAttemptsException,
  TooManyRequestsException,
  UnauthorizedException,
  UnsupportedTokenTypeException,
  UserLambdaValidationException,
  UsernameExistsException,
  UserNotConfirmedException,
  UserNotFoundException,
} from '@aws-sdk/client-cognito-identity-provider';

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
import { ErrorCode } from '@application/errors/shared/ErrorCode';
import type { AuthGateway } from '@application/gateways/auth/AuthGateway';
import { cognitoClient } from '@infra/clients/cognitoClient';
import { AppConfig } from '@shared/config/AppConfig';

export class CognitoAuthGateway implements AuthGateway {
  constructor(private readonly config: AppConfig) {}

  async signUp({
    email,
    password,
    internalId,
  }: AuthGateway.SignUpParams): Promise<AuthGateway.SignUpResult> {
    try {
      const command = new SignUpCommand({
        ClientId: this.config.cognitoClientId,
        SecretHash: this.secretHash(email),
        Username: email,
        Password: password,
        UserAttributes: [
          { Name: 'email', Value: email },
          { Name: 'custom:internalId', Value: internalId },
        ],
      });

      const { UserSub } = await cognitoClient.send(command);

      if (!UserSub) {
        throw new Error('Cognito signed the user up without returning a sub.');
      }

      return { externalId: UserSub };
    } catch (error) {
      if (error instanceof UsernameExistsException) {
        throw new AuthUserExists(email);
      }

      if (error instanceof InvalidPasswordException) {
        throw new InvalidPassword();
      }

      throw CognitoAuthGateway.translateLimits(error);
    }
  }

  async signIn({
    email,
    password,
  }: AuthGateway.SignInParams): Promise<AuthGateway.Issued> {
    try {
      const command = new InitiateAuthCommand({
        ClientId: this.config.cognitoClientId,
        AuthFlow: 'USER_PASSWORD_AUTH',
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password,
          SECRET_HASH: this.secretHash(email),
        },
      });

      const { AuthenticationResult, ChallengeName } =
        await cognitoClient.send(command);

      return CognitoAuthGateway.toIssued(AuthenticationResult, ChallengeName);
    } catch (error) {
      if (
        error instanceof NotAuthorizedException ||
        error instanceof PasswordResetRequiredException ||
        error instanceof UserNotFoundException
      ) {
        throw new InvalidCredentials();
      }

      if (error instanceof UserNotConfirmedException) {
        throw new EmailNotConfirmed();
      }

      const refusal = CognitoAuthGateway.translateTokenRefusal(error);

      throw CognitoAuthGateway.translateLimits(refusal);
    }
  }

  async refreshTokens(refreshToken: string): Promise<AuthGateway.Issued> {
    try {
      const command = new GetTokensFromRefreshTokenCommand({
        ClientId: this.config.cognitoClientId,
        ClientSecret: this.config.cognitoClientSecret,
        RefreshToken: refreshToken,
      });

      const { AuthenticationResult } = await cognitoClient.send(command);

      return CognitoAuthGateway.toIssued(AuthenticationResult);
    } catch (error) {
      if (
        error instanceof NotAuthorizedException ||
        error instanceof RefreshTokenReuseException ||
        error instanceof UserNotFoundException
      ) {
        throw new InvalidSession();
      }

      const refusal = CognitoAuthGateway.translateTokenRefusal(error);

      throw CognitoAuthGateway.translateLimits(refusal);
    }
  }

  // A token Cognito no longer takes is already as good as revoked.
  async revokeToken(refreshToken: string): Promise<void> {
    try {
      const command = new RevokeTokenCommand({
        ClientId: this.config.cognitoClientId,
        ClientSecret: this.config.cognitoClientSecret,
        Token: refreshToken,
      });

      await cognitoClient.send(command);
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof UnsupportedTokenTypeException
      ) {
        return;
      }

      throw error;
    }
  }

  async forgotPassword(email: string): Promise<void> {
    try {
      const command = new ForgotPasswordCommand({
        ClientId: this.config.cognitoClientId,
        Username: email,
        SecretHash: this.secretHash(email),
      });

      await cognitoClient.send(command);
    } catch (error) {
      if (
        error instanceof UserNotFoundException ||
        error instanceof InvalidParameterException ||
        error instanceof NotAuthorizedException
      ) {
        console.warn(
          JSON.stringify({ event: 'ResetCodeNotSent', reason: error.name }),
        );
        return;
      }

      throw CognitoAuthGateway.translateLimits(error);
    }
  }

  async resetPassword({
    email,
    code,
    newPassword,
  }: AuthGateway.ResetPasswordParams): Promise<void> {
    try {
      const command = new ConfirmForgotPasswordCommand({
        ClientId: this.config.cognitoClientId,
        Username: email,
        ConfirmationCode: code,
        Password: newPassword,
        SecretHash: this.secretHash(email),
      });

      await cognitoClient.send(command);
    } catch (error) {
      if (
        error instanceof CodeMismatchException ||
        error instanceof ExpiredCodeException ||
        error instanceof UserNotFoundException ||
        error instanceof UserNotConfirmedException ||
        error instanceof NotAuthorizedException
      ) {
        throw new InvalidCode();
      }

      if (error instanceof InvalidPasswordException) {
        throw new InvalidPassword();
      }

      throw CognitoAuthGateway.translateLimits(error);
    }
  }

  async confirmSignUp(email: string, code: string): Promise<void> {
    try {
      const command = new ConfirmSignUpCommand({
        ClientId: this.config.cognitoClientId,
        Username: email,
        ConfirmationCode: code,
        SecretHash: this.secretHash(email),
      });

      await cognitoClient.send(command);
    } catch (error) {
      if (
        error instanceof CodeMismatchException ||
        error instanceof ExpiredCodeException ||
        error instanceof UserNotFoundException
      ) {
        throw new InvalidCode();
      }

      if (error instanceof NotAuthorizedException) {
        throw new AuthUserNotPending(email);
      }

      throw CognitoAuthGateway.translateLimits(error);
    }
  }

  async resendConfirmationCode(email: string): Promise<void> {
    try {
      const command = new ResendConfirmationCodeCommand({
        ClientId: this.config.cognitoClientId,
        Username: email,
        SecretHash: this.secretHash(email),
      });

      await cognitoClient.send(command);
    } catch (error) {
      if (
        error instanceof UserNotFoundException ||
        error instanceof InvalidParameterException
      ) {
        console.warn(
          JSON.stringify({ event: 'ResendCodeSkipped', reason: error.name }),
        );
        return;
      }

      throw CognitoAuthGateway.translateLimits(error);
    }
  }

  async isUserConfirmed(email: string): Promise<boolean> {
    try {
      const command = new AdminGetUserCommand({
        UserPoolId: this.config.cognitoPoolId,
        Username: email,
      });

      const { UserStatus } = await cognitoClient.send(command);

      return UserStatus === 'CONFIRMED';
    } catch (error) {
      if (error instanceof UserNotFoundException) {
        return false;
      }

      throw error;
    }
  }

  async deleteUnconfirmedUser(
    email: string,
  ): Promise<AuthGateway.DeleteUnconfirmedResult> {
    const UserPoolId = this.config.cognitoPoolId;

    try {
      const getUserCommand = new AdminGetUserCommand({
        UserPoolId,
        Username: email,
      });

      const { UserStatus } = await cognitoClient.send(getUserCommand);

      if (UserStatus !== 'UNCONFIRMED') {
        return 'confirmed';
      }

      const deleteUserCommand = new AdminDeleteUserCommand({
        UserPoolId,
        Username: email,
      });

      await cognitoClient.send(deleteUserCommand);

      return 'deleted';
    } catch (error) {
      if (error instanceof UserNotFoundException) {
        return 'not-found';
      }

      throw error;
    }
  }

  async deleteExpiredSignUp({
    email,
    accountId,
  }: AuthGateway.ExpiredSignUp): Promise<AuthGateway.DeleteExpiredResult> {
    const UserPoolId = this.config.cognitoPoolId;
    // ListUsers, unlike AdminGetUser, does not make the user active this month (MAU).
    const { Users = [] } = await cognitoClient.send(
      new ListUsersCommand({
        UserPoolId,
        Filter: `email = "${email}"`,
        AttributesToGet: ['custom:internalId'],
      }),
    );
    const user = Users[0];

    if (!user?.Username) {
      return 'not-found';
    }

    const internalId = user.Attributes?.find(
      (attribute) => attribute.Name === 'custom:internalId',
    )?.Value;

    // A new sign-up with the same e-mail has its own internal id.
    if (internalId !== accountId) {
      return 'other-account';
    }

    if (user.UserStatus !== 'UNCONFIRMED') {
      return 'confirmed';
    }

    try {
      await cognitoClient.send(
        new AdminDeleteUserCommand({ UserPoolId, Username: user.Username }),
      );
    } catch (error) {
      if (!(error instanceof UserNotFoundException)) {
        throw error;
      }
    }

    return 'deleted';
  }

  async listUnconfirmedUsers(): Promise<AuthGateway.UnconfirmedUser[]> {
    const users: AuthGateway.UnconfirmedUser[] = [];
    let PaginationToken: string | undefined;

    do {
      const page = await cognitoClient.send(
        new ListUsersCommand({
          UserPoolId: this.config.cognitoPoolId,
          Filter: 'cognito:user_status = "UNCONFIRMED"',
          AttributesToGet: ['email', 'custom:internalId'],
          PaginationToken,
        }),
      );

      for (const user of page.Users ?? []) {
        const attribute = (name: string) =>
          user.Attributes?.find((a) => a.Name === name)?.Value;

        users.push({
          email: attribute('email') ?? user.Username ?? '',
          accountId: attribute('custom:internalId'),
        });
      }

      PaginationToken = page.PaginationToken;
    } while (PaginationToken);

    return users;
  }

  private secretHash(username: string): string {
    return createHmac('sha256', this.config.cognitoClientSecret)
      .update(username + this.config.cognitoClientId)
      .digest('base64');
  }

  private static translateLimits(error: unknown): unknown {
    if (
      error instanceof TooManyRequestsException ||
      error instanceof LimitExceededException ||
      error instanceof TooManyFailedAttemptsException
    ) {
      return new TooManyRequests();
    }

    return error;
  }

  private static toIssued(
    result: AuthenticationResultType | undefined,
    challenge?: string,
  ): AuthGateway.Issued {
    if (!result?.AccessToken || !result.RefreshToken || !result.ExpiresIn) {
      throw new Error(
        `Cognito issued no tokens${challenge ? ` (challenge ${challenge})` : ''}.`,
      );
    }

    const { internalId, jti } = CognitoAuthGateway.readClaims(
      result.AccessToken,
    );

    return {
      tokens: {
        accessToken: result.AccessToken,
        refreshToken: result.RefreshToken,
        expiresIn: result.ExpiresIn,
      },
      accountId: Account.toId(internalId),
      accessJti: jti,
    };
  }

  // The token comes straight from Cognito, so its payload is read, not verified.
  private static readClaims(accessToken: string): {
    internalId: string;
    jti: string;
  } {
    const payload = accessToken.split('.')[1] ?? '';
    const claims = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8'),
    ) as Record<string, unknown>;

    if (
      typeof claims.internalId !== 'string' ||
      typeof claims.jti !== 'string'
    ) {
      throw new Error('The access token has no internalId or jti claim.');
    }

    return { internalId: claims.internalId, jti: claims.jti };
  }

  private static translateTokenRefusal(error: unknown): unknown {
    if (
      error instanceof UserLambdaValidationException &&
      error.message.includes(ErrorCode.AccountUnavailable)
    ) {
      return new AccountUnavailable();
    }

    return error;
  }
}
