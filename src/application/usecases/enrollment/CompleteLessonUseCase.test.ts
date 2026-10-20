import { beforeEach, describe, expect, it } from 'vitest';

import { uniqueEmail } from '@tests/support/accountWorld';
import { courseWorld } from '@tests/support/courseWorld';

import { Account } from '@application/entities/account/Account';
import { Enrollment } from '@application/entities/enrollment/Enrollment';
import type { Lesson } from '@application/entities/outline/Lesson';
import { Forbidden } from '@application/errors/common';
import { CourseNotFound } from '@application/errors/course';
import { LessonNotFound } from '@application/errors/outline';
import { CompleteLessonUseCase } from '@application/usecases/enrollment/CompleteLessonUseCase';

let world: Awaited<ReturnType<typeof courseWorld>>;
let completeLesson: CompleteLessonUseCase;
let lesson: Lesson;
let student: Account;

const enrollStudent = async () => {
  const unit = world.unitOfWork();
  unit.add(
    world.enrollments.createOperation(
      Enrollment.create({ student, course: world.course }),
    ),
  );
  await unit.commit();
};

const complete = (caller: Account, lessonId = lesson.id) =>
  completeLesson.execute({ ...world.as(caller), lessonId });

beforeEach(async () => {
  world = await courseWorld();
  completeLesson = new CompleteLessonUseCase(
    world.courses,
    world.enrollments,
    world.lessons,
    world.progress,
    world.unitOfWork,
  );
  lesson = await world.addLesson(await world.addModule('M1', 0), 0);
  student = Account.create({ name: 'Duda', email: uniqueEmail('duda') });
  await world.setCourse({ status: 'PUBLISHED' });
});

describe('CompleteLessonUseCase', () => {
  it('should complete once and answer the same count again without writing', async () => {
    await enrollStudent();

    await expect(complete(student)).resolves.toEqual({
      lessonId: lesson.id,
      completedLessons: 1,
      created: true,
    });
    await expect(complete(student)).resolves.toEqual({
      lessonId: lesson.id,
      completedLessons: 1,
      created: false,
    });
  });

  it('should still record progress in an archived course', async () => {
    await enrollStudent();
    await world.setCourse({ status: 'ARCHIVED' });

    await expect(complete(student)).resolves.toMatchObject({ created: true });
  });

  it('should refuse anyone without an active enrollment, the owner included', async () => {
    await expect(complete(student)).rejects.toBeInstanceOf(Forbidden);
    await expect(complete(world.owner)).rejects.toBeInstanceOf(Forbidden);

    await world.setCourse({ status: 'DRAFT' });
    await expect(complete(world.other)).rejects.toBeInstanceOf(CourseNotFound);
    await expect(complete(world.owner)).rejects.toBeInstanceOf(Forbidden);
  });

  it('should answer not found for a lesson of another course', async () => {
    await enrollStudent();
    const other = await courseWorld();
    const foreign = await other.addLesson(await other.addModule('M', 0), 0);

    await expect(complete(student, foreign.id)).rejects.toBeInstanceOf(
      LessonNotFound,
    );
  });
});
