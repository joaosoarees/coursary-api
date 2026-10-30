import type { Account } from '@application/entities/account/Account';

export interface CourseEditor {
  callerId: Account.Id;
  callerRole: Account.Role;
}
