import { ListNotificationsController } from '@application/controllers/notification/ListNotificationsController';
import { ListNotificationsUseCase } from '@application/usecases/notification/ListNotificationsUseCase';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';
import { makeListNotificationsQuery } from '@main/factories/makeListNotificationsQuery';
import { makeNotificationRepository } from '@main/factories/makeNotificationRepository';
import { makeResolveCallerUseCase } from '@main/factories/makeResolveCallerUseCase';

const listNotificationsUseCase = new ListNotificationsUseCase(
  makeListNotificationsQuery(),
  makeNotificationRepository(),
);
const controller = new ListNotificationsController(listNotificationsUseCase);
const resolveCaller = makeResolveCallerUseCase();

export const handler = lambdaHttpAdapter(controller, resolveCaller);
