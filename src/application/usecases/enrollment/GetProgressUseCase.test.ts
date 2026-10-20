import { beforeEach, describe, expect, it } from 'vitest';

import { uniqueEmail } from '@tests/support/accountWorld';
import { courseWorld } from '@tests/support/courseWorld';

import { Account } from '@application/entities/account/Account';
import { Enrollment } from '@application/entities/enrollment/Enrollment';
import { Forbidden } from '@application/errors/common';
import { CompleteLessonUseCase } from '@application/usecases/enrollment/CompleteLessonUseCase';
import { GetProgressUseCase } from '@application/usecases/enrollment/GetProgressUseCase';

let world: Awaited<ReturnType<typeof courseWorld>>;
let getProgress: GetProgressUseCase;
let student: Account;

const progressOf = (caller: Account) => getProgress.execute(world.as(caller));

beforeEach(async () => {
  world = await courseWorld();
  getProgress = new GetProgressUseCase(
    world.courses,
    world.enrollments,
    world.courseProgress,
  );
  student = Account.create({ name: 'Duda', email: uniqueEmail('duda') });
});

describe('GetProgressUseCase', () => {
  it('should count and list the completed lessons, with no position yet', async () => {
    const module = await world.addModule('M1', 0);
    const first = await world.addLesson(module, 0);
    await world.addLesson(module, 1);
    await world.setCourse({ status: 'PUBLISHED' });
    const unit = world.unitOfWork();
    unit.add(
      world.enrollments.createOperation(
        Enrollment.create({ student, course: world.course }),
      ),
    );
    await unit.commit();
    await new CompleteLessonUseCase(
      world.courses,
      world.enrollments,
      world.lessons,
      world.progress,
      world.unitOfWork,
    ).execute({ ...world.as(student), lessonId: first.id });

    await expect(progressOf(student)).resolves.toEqual({
      completedLessons: 1,
      completedLessonIds: [first.id],
      lastLessonId: null,
      positionSeconds: null,
    });
  });

  it('should refuse anyone without an active enrollment', async () => {
    await world.setCourse({ status: 'PUBLISHED' });

    await expect(progressOf(student)).rejects.toBeInstanceOf(Forbidden);
    await expect(progressOf(world.owner)).rejects.toBeInstanceOf(Forbidden);
  });
});
