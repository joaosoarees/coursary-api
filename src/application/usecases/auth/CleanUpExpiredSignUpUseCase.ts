import type { Account } from '@application/entities/account/Account';
import type { AuthGateway } from '@application/gateways/auth/AuthGateway';

// The table decides, Cognito obeys: an account that expired unconfirmed takes its user along (Q41, Q342).
export class CleanUpExpiredSignUpUseCase {
  constructor(private readonly authGateway: AuthGateway) {}

  async execute(
    expired: CleanUpExpiredSignUpUseCase.Input,
  ): Promise<AuthGateway.DeleteExpiredResult> {
    const outcome = await this.authGateway.deleteExpiredSignUp(expired);
    const skipped = outcome === 'confirmed' || outcome === 'other-account';

    console[skipped ? 'warn' : 'info'](
      JSON.stringify({
        event: skipped ? 'CleanupSkipped' : 'CleanupDone',
        accountId: expired.accountId,
        outcome,
      }),
    );

    return outcome;
  }
}

export namespace CleanUpExpiredSignUpUseCase {
  export interface Input {
    accountId: Account.Id;
    email: string;
  }
}
