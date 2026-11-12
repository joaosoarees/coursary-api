import type { z } from 'zod';

import { Controller } from '@application/contracts/Controller';
import { paginationSchema } from '@application/controllers/shared/schemas';
import type { ListNotificationsUseCase } from '@application/usecases/notification/ListNotificationsUseCase';

export class ListNotificationsController extends Controller<
  'private',
  ListNotificationsUseCase.Output
> {
  protected override readonly queryParamsSchema = paginationSchema;

  constructor(private readonly listNotifications: ListNotificationsUseCase) {
    super();
  }

  protected async handle({
    accountId,
    queryParams,
  }: Controller.Request<
    'private',
    Record<string, unknown>,
    Record<string, unknown>,
    ListNotificationsController.QueryParams
  >): Promise<Controller.Response<ListNotificationsUseCase.Output>> {
    const page = await this.listNotifications.execute({
      accountId,
      ...queryParams,
    });

    return { statusCode: 200, body: page };
  }
}

export namespace ListNotificationsController {
  export type QueryParams = z.infer<typeof paginationSchema>;
}
