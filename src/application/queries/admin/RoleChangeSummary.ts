import type { Account } from '@application/entities/account/Account';
import type { RoleChange } from '@application/entities/account/RoleChange';

export class RoleChangeSummary {
  readonly id: string;
  readonly fromRole: Account.Role;
  readonly toRole: Account.Role;
  readonly changedBy: string;
  readonly changedAt: string;

  constructor(attributes: RoleChangeSummary) {
    this.id = attributes.id;
    this.fromRole = attributes.fromRole;
    this.toRole = attributes.toRole;
    this.changedBy = attributes.changedBy;
    this.changedAt = attributes.changedAt;
  }

  static fromRoleChange(roleChange: RoleChange): RoleChangeSummary {
    return new RoleChangeSummary({
      id: roleChange.id,
      fromRole: roleChange.fromRole,
      toRole: roleChange.toRole,
      changedBy: roleChange.changedBy,
      changedAt: roleChange.changedAt.toISOString(),
    });
  }
}
