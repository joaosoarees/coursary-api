import { beforeEach, describe, expect, it } from 'vitest';

import { uniqueEmail } from '@tests/support/accountWorld';
import { courseWorld } from '@tests/support/courseWorld';

import { Account } from '@application/entities/account/Account';
import { Enrollment } from '@application/entities/enrollment/Enrollment';
import type { Lesson } from '@application/entities/outline/Lesson';
import { Forbidden } from '@application/errors/common';
import { GetProgressUseCase } from '@application/usecases/enrollment/GetProgressUseCase';
import { SavePositionUseCase } from '@application/usecases/enrollment/SavePositionUseCase';

let world: Awaited<ReturnType<typeof courseWorld>>;
let savePosition: SavePositionUseCase;
let lesson: Lesson;
let student: Account;

const save = (caller: Account, positionSeconds: number) =>
  savePosition.execute({
    ...world.as(caller),
    lessonId: lesson.id,
    positionSeconds,
  });

beforeEach(async () => {
  world = await courseWorld();
  savePosition = new SavePositionUseCase(
    world.courses,
    world.enrollments,
    world.progress,
  );
  lesson = await world.addLesson(await world.addModule('M1', 0), 0);
  student = Account.create({ name: 'Duda', email: uniqueEmail('duda') });
  await world.setCourse({ status: 'PUBLISHED' });
});

describe('SavePositionUseCase', () => {
  it('should keep only the latest position, read back with the progress', async () => {
    const unit = world.unitOfWork();
    unit.add(
      world.enrollments.createOperation(
        Enrollment.create({ student, course: world.course }),
      ),
    );
    await unit.commit();

    await save(student, 30);
    await save(student, 95);

    await expect(
      new GetProgressUseCase(
        world.courses,
        world.enrollments,
        world.courseProgress,
      ).execute(world.as(student)),
    ).resolves.toMatchObject({
      completedLessonIds: [],
      lastLessonId: lesson.id,
      positionSeconds: 95,
    });
  });

  it('should refuse anyone without an active enrollment', async () => {
    await expect(save(student, 10)).rejects.toBeInstanceOf(Forbidden);
  });
});
