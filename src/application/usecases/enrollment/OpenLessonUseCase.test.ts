import { beforeEach, describe, expect, it } from 'vitest';

import { uniqueEmail } from '@tests/support/accountWorld';
import { courseWorld } from '@tests/support/courseWorld';

import { Account } from '@application/entities/account/Account';
import { Enrollment } from '@application/entities/enrollment/Enrollment';
import type { Lesson } from '@application/entities/outline/Lesson';
import { Forbidden } from '@application/errors/common';
import { CourseNotFound } from '@application/errors/course';
import { LessonNotFound } from '@application/errors/outline';
import { OpenLessonUseCase } from '@application/usecases/enrollment/OpenLessonUseCase';

let world: Awaited<ReturnType<typeof courseWorld>>;
let openLesson: OpenLessonUseCase;
let lesson: Lesson;
let student: Account;

const enrollStudent = async () => {
  const enrollment = Enrollment.create({ student, course: world.course });
  const unit = world.unitOfWork();
  unit.add(world.enrollments.createOperation(enrollment));
  await unit.commit();

  return enrollment;
};

const open = (caller: Account, lessonId = lesson.id) =>
  openLesson.execute({ ...world.as(caller), lessonId });

beforeEach(async () => {
  world = await courseWorld();
  openLesson = new OpenLessonUseCase(
    world.courses,
    world.enrollments,
    world.lessons,
  );
  const module = await world.addModule('M1', 0);
  lesson = await world.addLesson(module, 0);
  student = Account.create({ name: 'Duda', email: uniqueEmail('duda') });
  await world.setCourse({ status: 'PUBLISHED' });
});

describe('OpenLessonUseCase', () => {
  it('should open the lesson to an enrolled student, also once archived', async () => {
    await enrollStudent();

    await expect(open(student)).resolves.toEqual({
      lessonId: lesson.id,
      courseId: world.course.id,
      body: '',
    });

    await world.setCourse({ status: 'ARCHIVED' });
    await expect(open(student)).resolves.toMatchObject({ lessonId: lesson.id });
  });

  it('should refuse a student who left the course', async () => {
    const enrollment = await enrollStudent();
    const unit = world.unitOfWork();
    unit.add(world.enrollments.cancelOperation(enrollment));
    await unit.commit();

    await expect(open(student)).rejects.toBeInstanceOf(Forbidden);
  });

  it('should refuse anyone else: 403 on a visible course, 404 on a draft', async () => {
    await expect(open(student)).rejects.toBeInstanceOf(Forbidden);
    await expect(open(world.other)).rejects.toBeInstanceOf(Forbidden);

    await world.setCourse({ status: 'DRAFT' });
    await expect(open(world.other)).rejects.toBeInstanceOf(CourseNotFound);
  });

  it('should open any lesson to the owner and an admin, whatever the status', async () => {
    await world.setCourse({ status: 'DRAFT' });
    await expect(open(world.owner)).resolves.toMatchObject({ body: '' });

    await world.setCourse({ status: 'ARCHIVED' });
    await expect(open(world.admin)).resolves.toMatchObject({ body: '' });
  });

  it('should answer not found for a lesson of another course', async () => {
    const other = await courseWorld();
    const otherLesson = await other.addLesson(await other.addModule('M', 0), 0);

    await expect(open(world.owner, otherLesson.id)).rejects.toBeInstanceOf(
      LessonNotFound,
    );
  });
});
