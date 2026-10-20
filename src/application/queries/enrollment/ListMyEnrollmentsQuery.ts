import type { Page } from '@application/contracts/Page';
import type { Account } from '@application/entities/account/Account';
import type { EnrollmentSummary } from '@application/queries/enrollment/EnrollmentSummary';

export interface ListMyEnrollmentsQuery {
  execute: (
    input: ListMyEnrollmentsQuery.Input,
  ) => Promise<Page<EnrollmentSummary>>;
}

export namespace ListMyEnrollmentsQuery {
  export interface Input {
    accountId: Account.Id;
    page: Page.Options;
  }
}
