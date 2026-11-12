import { Course } from '@application/entities/course/Course';
import {
  Notification,
  notificationKinds,
} from '@application/entities/notification/Notification';
import type { NotificationQueue } from '@application/gateways/notification/NotificationQueue';
import type { CourseOutlineQuery } from '@application/queries/outline/CourseOutlineQuery';
import type { CourseRepository } from '@application/repositories/course/CourseRepository';
import type { NotificationRepository } from '@application/repositories/notification/NotificationRepository';
import type { QuestionRepository } from '@application/repositories/question/QuestionRepository';

type Input = Extract<NotificationQueue.Request, { kind: 'question' }>;

// The course's instructor hears of a new question.
export class NotifyQuestionUseCase {
  constructor(
    private readonly questionsRepository: QuestionRepository,
    private readonly coursesRepository: CourseRepository,
    private readonly outline: CourseOutlineQuery,
    private readonly notificationsRepository: NotificationRepository,
  ) {}

  async execute({ lessonId, questionId }: Input): Promise<Notification[]> {
    const question = await this.questionsRepository.findQuestion(
      lessonId,
      questionId,
    );

    if (!question || question.removed) {
      return [];
    }

    const [found, outline] = await Promise.all([
      this.coursesRepository.findById(question.courseId),
      this.outline.execute(question.courseId),
    ]);
    const course = Course.requireFound(found);
    const notification = Notification.create({
      accountId: course.instructorId,
      kind: notificationKinds.Question,
      courseId: course.id,
      courseTitle: course.title,
      lessonId,
      lessonTitle: outline.lessonTitle(lessonId),
      questionId,
      actorName: question.authorName,
      byInstructor: false,
      sourceId: question.id,
      occurredAt: question.createdAt,
    });

    return (await this.notificationsRepository.saveIfNew(notification))
      ? [notification]
      : [];
  }
}
