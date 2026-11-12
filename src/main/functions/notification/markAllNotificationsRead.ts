import { MarkAllNotificationsReadController } from '@application/controllers/notification/MarkAllNotificationsReadController';
import { MarkAllNotificationsReadUseCase } from '@application/usecases/notification/MarkAllNotificationsReadUseCase';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';
import { makeNotificationRepository } from '@main/factories/makeNotificationRepository';
import { makeResolveCallerUseCase } from '@main/factories/makeResolveCallerUseCase';

const markAllReadUseCase = new MarkAllNotificationsReadUseCase(
  makeNotificationRepository(),
);
const controller = new MarkAllNotificationsReadController(markAllReadUseCase);
const resolveCaller = makeResolveCallerUseCase();

export const handler = lambdaHttpAdapter(controller, resolveCaller);
