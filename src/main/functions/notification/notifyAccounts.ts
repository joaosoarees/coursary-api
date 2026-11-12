import type { NotificationQueue } from '@application/gateways/notification/NotificationQueue';
import { NotifyAnswerUseCase } from '@application/usecases/notification/NotifyAnswerUseCase';
import { NotifyQuestionUseCase } from '@application/usecases/notification/NotifyQuestionUseCase';
import { NotifyStudentsUseCase } from '@application/usecases/notification/NotifyStudentsUseCase';
import { sqsBatchAdapter } from '@main/adapters/sqsBatchAdapter';
import { makeCourseOutlineQuery } from '@main/factories/makeCourseOutlineQuery';
import { makeCourseRepository } from '@main/factories/makeCourseRepository';
import { makeListCourseStudentsQuery } from '@main/factories/makeListCourseStudentsQuery';
import { makeNotificationQueue } from '@main/factories/makeNotificationQueue';
import { makeNotificationRepository } from '@main/factories/makeNotificationRepository';
import { makeQuestionRepository } from '@main/factories/makeQuestionRepository';
import { notificationMessageSchema } from '@main/functions/notification/notificationMessageSchema';

const questions = makeQuestionRepository();
const courses = makeCourseRepository();
const outline = makeCourseOutlineQuery();
const notifications = makeNotificationRepository();
const notifyAnswer = new NotifyAnswerUseCase(
  questions,
  courses,
  outline,
  notifications,
);
const notifyQuestion = new NotifyQuestionUseCase(
  questions,
  courses,
  outline,
  notifications,
);
const notifyStudents = new NotifyStudentsUseCase(
  courses,
  outline,
  makeListCourseStudentsQuery(),
  notifications,
  makeNotificationQueue(),
);

const notifyJob = {
  execute: (message: NotificationQueue.Request): Promise<unknown> => {
    switch (message.kind) {
      case 'answer':
        return notifyAnswer.execute(message);
      case 'question':
        return notifyQuestion.execute(message);
      case 'lesson':
      case 'archived':
        return notifyStudents.execute(message);
    }
  },
};

export const handler = sqsBatchAdapter(notificationMessageSchema, notifyJob, {
  ordered: false,
});
