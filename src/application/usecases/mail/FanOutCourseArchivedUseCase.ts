import { Account } from '@application/entities/account/Account';
import type { Course } from '@application/entities/course/Course';
import type { MailQueue } from '@application/gateways/mail/MailQueue';
import type { ListCourseStudentsQuery } from '@application/queries/enrollment/ListCourseStudentsQuery';

// One page of the course's active students per run, so any course size fits a short run.
export class FanOutCourseArchivedUseCase {
  constructor(
    private readonly students: ListCourseStudentsQuery,
    private readonly mailQueue: MailQueue,
    private readonly pageSize = 100,
  ) {}

  async execute({
    courseId,
    cursor,
  }: FanOutCourseArchivedUseCase.Input): Promise<FanOutCourseArchivedUseCase.Output> {
    const { items, nextCursor } = await this.students.execute({
      courseId,
      page: { limit: this.pageSize, cursor },
    });
    const notices: MailQueue.Request[] = items.map((student) => ({
      kind: 'course-archived',
      courseId,
      accountId: Account.toId(student.accountId),
    }));
    // A repeated page sends repeated notices, which the claim per student drops.
    const next: MailQueue.Request[] = nextCursor
      ? [{ kind: 'course-archived-fanout', courseId, cursor: nextCursor }]
      : [];

    await this.mailQueue.enqueue([...notices, ...next]);

    return { notified: notices.length, morePages: next.length > 0 };
  }
}

export namespace FanOutCourseArchivedUseCase {
  export interface Input {
    courseId: Course.Id;
    cursor?: string;
  }

  export interface Output {
    notified: number;
    morePages: boolean;
  }
}
