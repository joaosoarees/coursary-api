import type { Page } from '@application/contracts/Page';
import type { Account } from '@application/entities/account/Account';
import type { EnrollmentSummary } from '@application/queries/enrollment/EnrollmentSummary';
import type { ListMyEnrollmentsQuery } from '@application/queries/enrollment/ListMyEnrollmentsQuery';

export class ListMyEnrollmentsUseCase {
  constructor(private readonly listMyEnrollments: ListMyEnrollmentsQuery) {}

  execute({
    callerId,
    limit,
    cursor,
  }: ListMyEnrollmentsUseCase.Input): Promise<Page<EnrollmentSummary>> {
    return this.listMyEnrollments.execute({
      accountId: callerId,
      page: { limit, cursor },
    });
  }
}

export namespace ListMyEnrollmentsUseCase {
  export interface Input extends Page.Options {
    callerId: Account.Id;
  }
}
