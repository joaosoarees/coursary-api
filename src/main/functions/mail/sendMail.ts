import type { MailQueue } from '@application/gateways/mail/MailQueue';
import { FanOutCourseArchivedUseCase } from '@application/usecases/mail/FanOutCourseArchivedUseCase';
import { OnceMailer } from '@application/usecases/mail/OnceMailer';
import { SendCourseArchivedEmailUseCase } from '@application/usecases/mail/SendCourseArchivedEmailUseCase';
import { SendWelcomeEmailUseCase } from '@application/usecases/mail/SendWelcomeEmailUseCase';
import { sqsBatchAdapter } from '@main/adapters/sqsBatchAdapter';
import { makeAccountRepository } from '@main/factories/makeAccountRepository';
import { makeCourseRepository } from '@main/factories/makeCourseRepository';
import { makeEnrollmentRepository } from '@main/factories/makeEnrollmentRepository';
import { makeListCourseStudentsQuery } from '@main/factories/makeListCourseStudentsQuery';
import { makeMailGateway } from '@main/factories/makeMailGateway';
import { makeMailQueue } from '@main/factories/makeMailQueue';
import { makeMailTemplates } from '@main/factories/makeMailTemplates';
import { makeSentMailRepository } from '@main/factories/makeSentMailRepository';
import { mailMessageSchema } from '@main/functions/mail/mailMessageSchema';

const accounts = makeAccountRepository();
const templates = makeMailTemplates();
const onceMailer = new OnceMailer(makeSentMailRepository(), makeMailGateway());
const sendWelcome = new SendWelcomeEmailUseCase(
  accounts,
  templates,
  onceMailer,
);
const fanOut = new FanOutCourseArchivedUseCase(
  makeListCourseStudentsQuery(),
  makeMailQueue(),
);
const sendCourseArchived = new SendCourseArchivedEmailUseCase(
  accounts,
  makeEnrollmentRepository(),
  makeCourseRepository(),
  templates,
  onceMailer,
);

const mailJob = {
  execute: (message: MailQueue.Request): Promise<unknown> => {
    switch (message.kind) {
      case 'welcome':
        return sendWelcome.execute(message);
      case 'course-archived-fanout':
        return fanOut.execute(message);
      case 'course-archived':
        return sendCourseArchived.execute(message);
    }
  },
};

export const handler = sqsBatchAdapter(mailMessageSchema, mailJob, {
  ordered: false,
});
