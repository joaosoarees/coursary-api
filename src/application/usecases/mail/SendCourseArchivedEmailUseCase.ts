import {
  type Account,
  accountStatuses,
} from '@application/entities/account/Account';
import type { Course } from '@application/entities/course/Course';
import type { MailTemplates } from '@application/gateways/mail/MailTemplates';
import type { AccountRepository } from '@application/repositories/account/AccountRepository';
import type { CourseRepository } from '@application/repositories/course/CourseRepository';
import type { EnrollmentRepository } from '@application/repositories/enrollment/EnrollmentRepository';
import type { OnceMailer } from '@application/usecases/mail/OnceMailer';

// Tells one student a course they are enrolled in was archived, once per course (Q360, Q361).
export class SendCourseArchivedEmailUseCase {
  constructor(
    private readonly accountsRepository: AccountRepository,
    private readonly enrollmentsRepository: EnrollmentRepository,
    private readonly coursesRepository: CourseRepository,
    private readonly mailTemplates: MailTemplates,
    private readonly onceMailer: OnceMailer,
  ) {}

  async execute({
    courseId,
    accountId,
  }: SendCourseArchivedEmailUseCase.Input): Promise<SendCourseArchivedEmailUseCase.Outcome> {
    const [account, enrollment, course] = await Promise.all([
      this.accountsRepository.findById(accountId, { consistent: true }),
      this.enrollmentsRepository.find(accountId, courseId),
      this.coursesRepository.findById(courseId),
    ]);

    // Someone who left the course or the platform since the archive gets nothing.
    if (
      account?.status !== accountStatuses.Active ||
      !enrollment?.isActive() ||
      !course
    ) {
      console.warn(
        JSON.stringify({ event: 'MailSkipped', accountId, courseId }),
      );

      return 'skipped';
    }

    return this.onceMailer.send({
      accountId,
      kind: 'course-archived',
      ref: courseId,
      to: account.email,
      compose: () =>
        this.mailTemplates.courseArchived({
          name: account.name,
          title: course.title,
        }),
    });
  }
}

export namespace SendCourseArchivedEmailUseCase {
  export interface Input {
    courseId: Course.Id;
    accountId: Account.Id;
  }

  export type Outcome = OnceMailer.Outcome | 'skipped';
}
