import {
  type Account,
  accountRoles,
} from '@application/entities/account/Account';

export const permissions = {
  UsersList: 'users:list',
  UsersRead: 'users:read',
  UsersChangeRole: 'users:change-role',
  UsersChangeStatus: 'users:change-status',
  CoursesCreate: 'courses:create',
  CoursesUpdate: 'courses:update',
  CoursesUpdateAny: 'courses:update-any',
  CoursesListOwn: 'courses:list-own',
  CoursesPublish: 'courses:publish',
  CoursesArchive: 'courses:archive',
  CoursesDelete: 'courses:delete',
  CoursesEnroll: 'courses:enroll',
  CoursesListStudents: 'courses:list-students',
  CoursesLearn: 'courses:learn',
  CoursesReview: 'courses:review',
} as const;

export type Permission = (typeof permissions)[keyof typeof permissions];

// Each role holds every permission of the one below it.
const studentPermissions = [
  permissions.CoursesEnroll,
  permissions.CoursesLearn,
  permissions.CoursesReview,
] as const satisfies readonly Permission[];

const instructorPermissions = [
  ...studentPermissions,
  permissions.CoursesCreate,
  permissions.CoursesUpdate,
  permissions.CoursesListOwn,
  permissions.CoursesPublish,
  permissions.CoursesArchive,
  permissions.CoursesDelete,
  permissions.CoursesListStudents,
] as const satisfies readonly Permission[];

export const rolePermissions = {
  [accountRoles.Student]: studentPermissions,
  [accountRoles.Instructor]: instructorPermissions,
  [accountRoles.Admin]: [
    ...instructorPermissions,
    permissions.UsersList,
    permissions.UsersRead,
    permissions.UsersChangeRole,
    permissions.UsersChangeStatus,
    permissions.CoursesUpdateAny,
  ],
} as const satisfies Record<Account.Role, readonly Permission[]>;

export const Permissions = {
  allows(role: Account.Role, permission: Permission): boolean {
    const granted: readonly Permission[] = rolePermissions[role];

    return granted.includes(permission);
  },
};
