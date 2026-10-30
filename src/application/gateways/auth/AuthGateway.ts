import type { Account } from '@application/entities/account/Account';

export interface AuthGateway {
  signUp: (
    params: AuthGateway.SignUpParams,
  ) => Promise<AuthGateway.SignUpResult>;

  signIn: (params: AuthGateway.SignInParams) => Promise<AuthGateway.Issued>;

  refreshTokens: (refreshToken: string) => Promise<AuthGateway.Issued>;

  // A token already unusable counts as revoked.
  revokeToken: (refreshToken: string) => Promise<void>;

  forgotPassword: (email: string) => Promise<void>;

  resetPassword: (params: AuthGateway.ResetPasswordParams) => Promise<void>;

  confirmSignUp: (email: string, code: string) => Promise<void>;

  resendConfirmationCode: (email: string) => Promise<void>;

  isUserConfirmed: (email: string) => Promise<boolean>;

  deleteUnconfirmedUser: (
    email: string,
  ) => Promise<AuthGateway.DeleteUnconfirmedResult>;

  // Deletes the user of an expired sign-up only if it is still that account's and unconfirmed (Q342).
  deleteExpiredSignUp: (
    params: AuthGateway.ExpiredSignUp,
  ) => Promise<AuthGateway.DeleteExpiredResult>;

  // Every user that never confirmed, with the account id it was signed up with (Q345).
  listUnconfirmedUsers: () => Promise<AuthGateway.UnconfirmedUser[]>;
}

export namespace AuthGateway {
  export interface SignUpParams {
    email: string;
    password: string;
    internalId: string;
  }

  export interface SignUpResult {
    externalId: string;
  }

  export interface SignInParams {
    email: string;
    password: string;
  }

  export interface ResetPasswordParams {
    email: string;
    code: string;
    newPassword: string;
  }

  export interface Tokens {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }

  export interface Issued {
    tokens: Tokens;
    accountId: Account.Id;
    accessJti: string;
  }

  export type DeleteUnconfirmedResult = 'deleted' | 'not-found' | 'confirmed';

  export interface ExpiredSignUp {
    email: string;
    accountId: Account.Id;
  }

  export type DeleteExpiredResult = DeleteUnconfirmedResult | 'other-account';

  export interface UnconfirmedUser {
    email: string;
    // custom:internalId; absent only on a user made outside the sign-up.
    accountId: string | undefined;
  }
}
