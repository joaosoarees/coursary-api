import { Account } from '@application/entities/account/Account';
import { courseStatuses } from '@application/entities/course/Course';
import {
  Notification,
  notificationKinds,
} from '@application/entities/notification/Notification';
import type { NotificationQueue } from '@application/gateways/notification/NotificationQueue';
import type { ListCourseStudentsQuery } from '@application/queries/enrollment/ListCourseStudentsQuery';
import type { CourseOutlineQuery } from '@application/queries/outline/CourseOutlineQuery';
import type { CourseRepository } from '@application/repositories/course/CourseRepository';
import type { NotificationRepository } from '@application/repositories/notification/NotificationRepository';

type Input = Extract<
  NotificationQueue.Request,
  { kind: 'lesson' | 'archived' }
>;

const IN_FLIGHT = 10;

// One page of the course's active students per run, so any course size fits a short run.
export class NotifyStudentsUseCase {
  constructor(
    private readonly coursesRepository: CourseRepository,
    private readonly outline: CourseOutlineQuery,
    private readonly students: ListCourseStudentsQuery,
    private readonly notificationsRepository: NotificationRepository,
    private readonly notificationQueue: NotificationQueue,
    private readonly pageSize = 100,
  ) {}

  async execute(input: Input): Promise<Notification[]> {
    const course = await this.coursesRepository.findById(input.courseId);
    const expected =
      input.kind === 'lesson'
        ? courseStatuses.Published
        : courseStatuses.Archived;

    // A lesson added to a draft has no one to tell; a course gone or moved on, neither.
    if (course?.status !== expected) {
      return [];
    }

    let lessonTitle: string | undefined;

    if (input.kind === 'lesson') {
      lessonTitle = (await this.outline.execute(course.id)).lessonTitle(
        input.lessonId,
      );

      if (lessonTitle === undefined) {
        return [];
      }
    }

    const { items, nextCursor } = await this.students.execute({
      courseId: course.id,
      page: { limit: this.pageSize, cursor: input.cursor },
    });
    const pending = items.map((student) =>
      Notification.create({
        accountId: Account.toId(student.accountId),
        kind:
          input.kind === 'lesson'
            ? notificationKinds.Lesson
            : notificationKinds.Archived,
        courseId: course.id,
        courseTitle: course.title,
        lessonId: input.kind === 'lesson' ? input.lessonId : undefined,
        lessonTitle,
        questionId: undefined,
        actorName: undefined,
        byInstructor: false,
        sourceId: input.kind === 'lesson' ? input.lessonId : course.id,
        occurredAt: new Date(input.occurredAt),
      }),
    );
    const saved: Notification[] = [];

    const worker = async () => {
      for (
        let notification = pending.shift();
        notification;
        notification = pending.shift()
      ) {
        if (await this.notificationsRepository.saveIfNew(notification)) {
          saved.push(notification);
        }
      }
    };

    await Promise.all(Array.from({ length: IN_FLIGHT }, worker));

    if (nextCursor) {
      await this.notificationQueue.enqueue([{ ...input, cursor: nextCursor }]);
    }

    return saved;
  }
}
