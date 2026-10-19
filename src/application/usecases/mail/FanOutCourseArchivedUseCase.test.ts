import { beforeEach, describe, expect, it } from 'vitest';

import { accountWorld } from '@tests/support/accountWorld';
import { courseWorld } from '@tests/support/courseWorld';

import { Enrollment } from '@application/entities/enrollment/Enrollment';
import type { MailQueue } from '@application/gateways/mail/MailQueue';
import { FanOutCourseArchivedUseCase } from '@application/usecases/mail/FanOutCourseArchivedUseCase';

let world: Awaited<ReturnType<typeof courseWorld>>;
let queued: MailQueue.Request[];
let fanOut: FanOutCourseArchivedUseCase;

beforeEach(async () => {
  world = await courseWorld();
  queued = [];
  fanOut = new FanOutCourseArchivedUseCase(
    world.students,
    {
      enqueue: (requests) => {
        queued.push(...requests);

        return Promise.resolve();
      },
    },
    2,
  );
  await world.setCourse({ status: 'PUBLISHED' });
});

const enrollStudents = async (count: number) => {
  const people = accountWorld();
  const ids = [];

  for (let i = 0; i < count; i++) {
    const student = await people.addAccount();
    const unit = world.unitOfWork();
    unit.add(
      world.enrollments.createOperation(
        Enrollment.create({ student, course: world.course }),
      ),
    );
    await unit.commit();
    ids.push(student.id);
  }

  return ids;
};

describe('FanOutCourseArchivedUseCase', () => {
  it('should queue a notice per active student, page after page', async () => {
    const ids = await enrollStudents(3);
    const courseId = world.course.id;

    await expect(fanOut.execute({ courseId })).resolves.toEqual({
      notified: 2,
      morePages: true,
    });
    const next = queued.find((r) => r.kind === 'course-archived-fanout');
    expect(next).toMatchObject({ courseId });

    await expect(
      fanOut.execute({
        courseId,
        cursor: next?.kind === 'course-archived-fanout' ? next.cursor : '',
      }),
    ).resolves.toEqual({ notified: 1, morePages: false });

    const noticed = queued.flatMap((r) =>
      r.kind === 'course-archived' ? [r.accountId] : [],
    );
    expect(noticed.sort()).toEqual([...ids].sort());
  });

  it('should queue nothing for a course without students', async () => {
    await expect(
      fanOut.execute({ courseId: world.course.id }),
    ).resolves.toEqual({ notified: 0, morePages: false });
    expect(queued).toEqual([]);
  });
});
