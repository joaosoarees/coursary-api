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

type Input = Extract<NotificationQueue.Request, { kind: 'answer' }>;

// The question's author hears of an answer, unless they wrote it.
export class NotifyAnswerUseCase {
  constructor(
    private readonly questionsRepository: QuestionRepository,
    private readonly coursesRepository: CourseRepository,
    private readonly outline: CourseOutlineQuery,
    private readonly notificationsRepository: NotificationRepository,
  ) {}

  async execute({
    lessonId,
    questionId,
    answerId,
  }: Input): Promise<Notification[]> {
    const [question, answer] = await Promise.all([
      this.questionsRepository.findQuestion(lessonId, questionId),
      this.questionsRepository.findAnswer(lessonId, questionId, answerId),
    ]);

    // Gone or removed by the time this runs: nothing to point at.
    if (
      !question ||
      !answer ||
      question.removed ||
      answer.authorId === question.authorId
    ) {
      return [];
    }

    const [found, outline] = await Promise.all([
      this.coursesRepository.findById(question.courseId),
      this.outline.execute(question.courseId),
    ]);
    const course = Course.requireFound(found);
    const notification = Notification.create({
      accountId: question.authorId,
      kind: notificationKinds.Answer,
      courseId: course.id,
      courseTitle: course.title,
      lessonId,
      lessonTitle: outline.lessonTitle(lessonId),
      questionId,
      actorName: answer.authorName,
      byInstructor: answer.byInstructor,
      sourceId: answer.id,
      occurredAt: answer.createdAt,
    });

    return (await this.notificationsRepository.saveIfNew(notification))
      ? [notification]
      : [];
  }
}
