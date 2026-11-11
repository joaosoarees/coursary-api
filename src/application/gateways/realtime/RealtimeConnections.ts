import type { Account } from '@application/entities/account/Account';
import type { Course } from '@application/entities/course/Course';

export interface RealtimeConnections {
  // Best effort: a failure is logged, never thrown, so it cannot undo the change that ended the
  // access (signing out, disabling, cancelling).
  closeForAccount: (input: RealtimeConnections.CloseInput) => Promise<void>;
}

export namespace RealtimeConnections {
  export interface CloseInput {
    accountId: Account.Id;
    // Only the connections to this course's lessons; every one of the account without it.
    courseId?: Course.Id;
  }
}
