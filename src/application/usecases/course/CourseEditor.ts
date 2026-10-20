import type { Account } from '@application/entities/account/Account';

// Who is asking to change a course: every outline use case takes this first.
export interface CourseEditor {
  callerId: Account.Id;
  callerRole: Account.Role;
}
