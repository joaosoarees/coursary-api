import { beforeEach, describe, expect, it } from 'vitest';

import { uniqueEmail } from '@tests/support/accountWorld';
import { courseWorld } from '@tests/support/courseWorld';

import { Account } from '@application/entities/account/Account';
import { Enrollment } from '@application/entities/enrollment/Enrollment';
import { LessonProgress } from '@application/entities/enrollment/LessonProgress';
import type { Lesson } from '@application/entities/outline/Lesson';
import { Conflict } from '@application/errors/common';
import { AlreadyCompleted } from '@application/errors/enrollment';
import { LessonNotFound } from '@application/errors/outline';

let world: Awaited<ReturnType<typeof courseWorld>>;
let lesson: Lesson;
let enrollment: Enrollment;

const complete = async (lessonId = lesson.id) => {
  const unit = world.unitOfWork();
  unit.add(
    world.progress.completeOperation(
      LessonProgress.create({ enrollment, lessonId }),
    ),
    world.enrollments.addCompletedLessonsOperation(enrollment, 1),
    world.lessons.inCourseOperation(world.course.id, lessonId),
  );
  await unit.commit();
};

const completed = async () =>
  (await world.enrollments.find(enrollment.accountId, world.course.id))
    ?.completedLessons;

beforeEach(async () => {
  world = await courseWorld();
  lesson = await world.addLesson(await world.addModule('M1', 0), 0);
  await world.setCourse({ status: 'PUBLISHED' });
  const student = Account.create({ name: 'Duda', email: uniqueEmail('duda') });
  enrollment = Enrollment.create({ student, course: world.course });
  const unit = world.unitOfWork();
  unit.add(world.enrollments.createOperation(enrollment));
  await unit.commit();
});

describe('DynamoProgressRepository', () => {
  it('should complete a lesson once and count it once', async () => {
    await complete();

    await expect(complete()).rejects.toBeInstanceOf(AlreadyCompleted);
    await expect(completed()).resolves.toBe(1);
  });

  it('should refuse a lesson of another course and count nothing', async () => {
    const other = await courseWorld();
    const foreign = await other.addLesson(await other.addModule('M', 0), 0);

    await expect(complete(foreign.id)).rejects.toBeInstanceOf(LessonNotFound);
    await expect(completed()).resolves.toBe(0);
  });

  it('should refuse a cancelled enrollment', async () => {
    const unit = world.unitOfWork();
    unit.add(world.enrollments.cancelOperation(enrollment));
    await unit.commit();

    await expect(complete()).rejects.toBeInstanceOf(Conflict);
  });
});
