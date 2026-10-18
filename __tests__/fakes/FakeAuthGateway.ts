import { Account } from '@application/entities/account/Account';
import {
  AuthUserExists,
  AuthUserNotPending,
  InvalidCode,
} from '@application/errors/auth';
import type { AuthGateway } from '@application/gateways/auth/AuthGateway';

export class FakeAuthGateway implements AuthGateway {
  static readonly unknownAccount = Account.toId('0'.repeat(27));

  readonly users = new Map<string, 'UNCONFIRMED' | 'CONFIRMED'>();
  readonly signUps: AuthGateway.SignUpParams[] = [];
  readonly codes = new Map<string, string>();
  readonly resends: string[] = [];
  failOnSignUp: Error | undefined;
  failOnResend: Error | undefined;
  failOnTokens: Error | undefined;
  failOnReset: Error | undefined;
  readonly resetCodesSent: string[] = [];
  readonly passwordResets: AuthGateway.ResetPasswordParams[] = [];
  readonly refreshTokensIssued: string[] = [];
  readonly accountIds = new Map<string, Account.Id>();
  readonly internalIds = new Map<string, string>();
  readonly accountIdsByRefreshToken = new Map<string, Account.Id>();

  signUp(params: AuthGateway.SignUpParams): Promise<AuthGateway.SignUpResult> {
    this.signUps.push(params);

    if (this.failOnSignUp) {
      return Promise.reject(this.failOnSignUp);
    }

    if (this.users.has(params.email)) {
      return Promise.reject(new AuthUserExists(params.email));
    }

    this.users.set(params.email, 'UNCONFIRMED');
    this.internalIds.set(params.email, params.internalId);
    this.codes.set(params.email, '123456');

    return Promise.resolve({ externalId: `sub-${params.email}` });
  }

  deleteExpiredSignUp({
    email,
    accountId,
  }: AuthGateway.ExpiredSignUp): Promise<AuthGateway.DeleteExpiredResult> {
    const status = this.users.get(email);

    if (!status) {
      return Promise.resolve('not-found');
    }

    if (this.internalIds.get(email) !== accountId) {
      return Promise.resolve('other-account');
    }

    if (status === 'CONFIRMED') {
      return Promise.resolve('confirmed');
    }

    this.users.delete(email);

    return Promise.resolve('deleted');
  }

  deleteUnconfirmedUser(
    email: string,
  ): Promise<AuthGateway.DeleteUnconfirmedResult> {
    const status = this.users.get(email);

    if (!status) {
      return Promise.resolve('not-found');
    }

    if (status === 'CONFIRMED') {
      return Promise.resolve('confirmed');
    }

    this.users.delete(email);

    return Promise.resolve('deleted');
  }

  confirmSignUp(email: string, code: string): Promise<void> {
    const status = this.users.get(email);

    if (status === 'CONFIRMED') {
      return Promise.reject(new AuthUserNotPending(email));
    }

    if (!status || this.codes.get(email) !== code) {
      return Promise.reject(new InvalidCode());
    }

    this.users.set(email, 'CONFIRMED');

    return Promise.resolve();
  }

  resendConfirmationCode(email: string): Promise<void> {
    this.resends.push(email);

    return this.failOnResend
      ? Promise.reject(this.failOnResend)
      : Promise.resolve();
  }

  isUserConfirmed(email: string): Promise<boolean> {
    return Promise.resolve(this.users.get(email) === 'CONFIRMED');
  }

  signIn({ email }: AuthGateway.SignInParams): Promise<AuthGateway.Issued> {
    return this.issueTokens(
      `refresh-${email}-${String(this.refreshTokensIssued.length)}`,
      this.accountIds.get(email) ?? FakeAuthGateway.unknownAccount,
    );
  }

  refreshTokens(refreshToken: string): Promise<AuthGateway.Issued> {
    return this.issueTokens(
      `${refreshToken}+`,
      this.accountIdsByRefreshToken.get(refreshToken) ??
        FakeAuthGateway.unknownAccount,
    );
  }

  private issueTokens(
    refreshToken: string,
    accountId: Account.Id,
  ): Promise<AuthGateway.Issued> {
    if (this.failOnTokens) {
      return Promise.reject(this.failOnTokens);
    }

    this.refreshTokensIssued.push(refreshToken);
    this.accountIdsByRefreshToken.set(refreshToken, accountId);

    return Promise.resolve({
      tokens: { accessToken: 'access', refreshToken, expiresIn: 3600 },
      accountId,
      accessJti: `jti-${String(this.refreshTokensIssued.length)}`,
    });
  }

  forgotPassword(email: string): Promise<void> {
    this.resetCodesSent.push(email);

    return Promise.resolve();
  }

  resetPassword(params: AuthGateway.ResetPasswordParams): Promise<void> {
    if (this.failOnReset) {
      return Promise.reject(this.failOnReset);
    }

    this.passwordResets.push(params);

    return Promise.resolve();
  }
}
