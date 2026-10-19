import type { Account } from '@application/entities/account/Account';
import type { Course } from '@application/entities/course/Course';

// Asks for domain e-mails to be sent; one queue for every kind (Q302, Q349, Q359).
export interface MailQueue {
  enqueue: (requests: MailQueue.Request[]) => Promise<void>;
}

export namespace MailQueue {
  export type Request =
    | { kind: 'welcome'; accountId: Account.Id }
    // One page of a course's active students; the next page comes as another message.
    | { kind: 'course-archived-fanout'; courseId: Course.Id; cursor?: string }
    | { kind: 'course-archived'; courseId: Course.Id; accountId: Account.Id };
}
