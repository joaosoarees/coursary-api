import { beforeEach, describe, expect, it } from 'vitest';

import { uniqueEmail } from '@tests/support/accountWorld';
import { courseWorld } from '@tests/support/courseWorld';

import { Account } from '@application/entities/account/Account';
import { Enrollment } from '@application/entities/enrollment/Enrollment';
import { Forbidden } from '@application/errors/common';
import { CourseNotFound } from '@application/errors/course';
import { ListCourseStudentsUseCase } from '@application/usecases/enrollment/ListCourseStudentsUseCase';

let world: Awaited<ReturnType<typeof courseWorld>>;
let listStudents: ListCourseStudentsUseCase;

// Enrolls a new student on the given day of 2026.
const enrollOn = async (name: string, day: number) => {
  const student = Account.create({ name, email: uniqueEmail(name) });
  const enrollment = new Enrollment({
    accountId: student.id,
    courseId: world.course.id,
    status: 'ACTIVE',
    studentName: name,
    enrolledAt: new Date(Date.UTC(2026, 0, day)),
    completedLessons: 0,
  });
  const unit = world.unitOfWork();
  unit.add(world.enrollments.createOperation(enrollment));
  await unit.commit();

  return enrollment;
};

const list = (caller: Account, cursor?: string) =>
  listStudents.execute({ ...world.as(caller), limit: 2, cursor });

beforeEach(async () => {
  world = await courseWorld();
  listStudents = new ListCourseStudentsUseCase(world.courses, world.students);
  await world.setCourse({ status: 'PUBLISHED' });
});

describe('ListCourseStudentsUseCase', () => {
  it('should list the active students to the owner, newest first, across pages', async () => {
    await enrollOn('Bia', 1);
    const cancelled = await enrollOn('Caio', 2);
    await enrollOn('Duda', 3);
    await enrollOn('Eva', 4);
    const unit = world.unitOfWork();
    unit.add(world.enrollments.cancelOperation(cancelled));
    await unit.commit();

    const first = await list(world.owner);
    const second = await list(world.owner, first.nextCursor ?? undefined);

    expect(
      [...first.items, ...second.items].map((item) => item.studentName),
    ).toEqual(['Eva', 'Duda', 'Bia']);
    expect(second.nextCursor).toBeNull();
    expect(first.items[0]).toMatchObject({
      enrolledAt: '2026-01-04T00:00:00.000Z',
      completedLessons: 0,
    });
  });

  it('should let an admin list an archived course', async () => {
    await enrollOn('Bia', 1);
    await world.setCourse({ status: 'ARCHIVED' });

    await expect(list(world.admin)).resolves.toMatchObject({
      items: [{ studentName: 'Bia' }],
    });
  });

  it('should refuse another instructor: 403 on a visible course, 404 on a draft', async () => {
    await expect(list(world.other)).rejects.toBeInstanceOf(Forbidden);

    await world.setCourse({ status: 'DRAFT' });
    await expect(list(world.other)).rejects.toBeInstanceOf(CourseNotFound);
  });
});
