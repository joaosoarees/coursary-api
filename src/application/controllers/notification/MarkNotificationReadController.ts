import type { z } from 'zod';

import { Controller } from '@application/contracts/Controller';
import { notificationParamsSchema } from '@application/controllers/notification/schemas';
import type { MarkNotificationReadUseCase } from '@application/usecases/notification/MarkNotificationReadUseCase';

export class MarkNotificationReadController extends Controller<'private'> {
  protected override readonly paramsSchema = notificationParamsSchema;

  constructor(private readonly markRead: MarkNotificationReadUseCase) {
    super();
  }

  protected async handle({
    accountId,
    params,
  }: Controller.Request<
    'private',
    Record<string, unknown>,
    MarkNotificationReadController.Params
  >): Promise<Controller.Response<undefined>> {
    await this.markRead.execute({
      accountId,
      notificationId: params.notificationId,
    });

    return { statusCode: 204 };
  }
}

export namespace MarkNotificationReadController {
  export type Params = z.infer<typeof notificationParamsSchema>;
}
