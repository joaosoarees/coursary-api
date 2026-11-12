import { MarkNotificationReadController } from '@application/controllers/notification/MarkNotificationReadController';
import { MarkNotificationReadUseCase } from '@application/usecases/notification/MarkNotificationReadUseCase';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';
import { makeNotificationRepository } from '@main/factories/makeNotificationRepository';
import { makeResolveCallerUseCase } from '@main/factories/makeResolveCallerUseCase';

const markReadUseCase = new MarkNotificationReadUseCase(
  makeNotificationRepository(),
);
const controller = new MarkNotificationReadController(markReadUseCase);
const resolveCaller = makeResolveCallerUseCase();

export const handler = lambdaHttpAdapter(controller, resolveCaller);
