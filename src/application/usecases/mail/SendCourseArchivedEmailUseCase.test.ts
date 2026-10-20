import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FakeMailGateway } from '@tests/fakes/FakeMailGateway';
import { FakeMailTemplates } from '@tests/fakes/FakeMailTemplates';
import { accountWorld } from '@tests/support/accountWorld';
import { courseWorld } from '@tests/support/courseWorld';

import type { Account } from '@application/entities/account/Account';
import { Enrollment } from '@application/entities/enrollment/Enrollment';
import { OnceMailer } from '@application/usecases/mail/OnceMailer';
import { SendCourseArchivedEmailUseCase } from '@application/usecases/mail/SendCourseArchivedEmailUseCase';

let world: Awaited<ReturnType<typeof courseWorld>>;
let people: ReturnType<typeof accountWorld>;
let mailGateway: FakeMailGateway;
let sendNotice: SendCourseArchivedEmailUseCase;

beforeEach(async () => {
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  world = await courseWorld();
  people = accountWorld();
  mailGateway = new FakeMailGateway();
  sendNotice = new SendCourseArchivedEmailUseCase(
    people.accounts,
    world.enrollments,
    world.courses,
    new FakeMailTemplates(),
    new OnceMailer(people.sentMails, mailGateway),
  );
  await world.setCourse({ status: 'PUBLISHED' });
});

const enroll = async (student: Account) => {
  const enrollment = Enrollment.create({ student, course: world.course });
  const unit = world.unitOfWork();
  unit.add(world.enrollments.createOperation(enrollment));
  await unit.commit();

  return enrollment;
};

const notice = (student: Account) =>
  sendNotice.execute({ courseId: world.course.id, accountId: student.id });

describe('SendCourseArchivedEmailUseCase', () => {
  it('should tell an enrolled student the course was archived, once', async () => {
    const student = await people.addAccount({ name: 'Duda' });
    await enroll(student);
    await world.setCourse({ status: 'ARCHIVED' });

    await expect(notice(student)).resolves.toBe('sent');
    await expect(notice(student)).resolves.toBe('already-sent');
    expect(mailGateway.sent).toEqual([
      {
        to: student.email,
        subject: 'Arquivado: T',
        html: '<p>Duda, T</p>',
        text: 'Duda, T',
      },
    ]);
  });

  it('should send nothing to a student who left the course', async () => {
    const student = await people.addAccount();
    const enrollment = await enroll(student);
    const unit = world.unitOfWork();
    unit.add(world.enrollments.cancelOperation(enrollment));
    await unit.commit();

    await expect(notice(student)).resolves.toBe('skipped');
    expect(mailGateway.sent).toEqual([]);
  });

  it('should send nothing to an account that is no longer active', async () => {
    const student = await people.addAccount({ status: 'DISABLED' });
    await enroll(student);

    await expect(notice(student)).resolves.toBe('skipped');
  });
});
