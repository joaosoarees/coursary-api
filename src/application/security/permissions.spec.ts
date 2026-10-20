import { describe, expect, it } from 'vitest';

import { accountRoles } from '@application/entities/account/Account';
import {
  Permissions,
  permissions,
  rolePermissions,
} from '@application/security/permissions';

describe('Permissions', () => {
  it('should let an admin manage users', () => {
    expect(Permissions.allows(accountRoles.Admin, permissions.UsersList)).toBe(
      true,
    );
    expect(
      Permissions.allows(accountRoles.Admin, permissions.UsersChangeRole),
    ).toBe(true);
  });

  it('should not let a student or an instructor manage users', () => {
    expect(
      Permissions.allows(accountRoles.Student, permissions.UsersList),
    ).toBe(false);
    expect(
      Permissions.allows(accountRoles.Instructor, permissions.UsersRead),
    ).toBe(false);
  });

  it('should give each role every action of the role below it', () => {
    expect(rolePermissions.instructor).toEqual(
      expect.arrayContaining([...rolePermissions.student]),
    );
    expect(rolePermissions.admin).toEqual(
      expect.arrayContaining([...rolePermissions.instructor]),
    );
  });

  it('should let a student enroll, learn and review, and nothing an instructor does', () => {
    expect(rolePermissions.student).toEqual([
      permissions.CoursesEnroll,
      permissions.CoursesLearn,
      permissions.CoursesReview,
    ]);
  });
});
