import { Controller } from '@application/contracts/Controller';
import type { MarkAllNotificationsReadUseCase } from '@application/usecases/notification/MarkAllNotificationsReadUseCase';

export class MarkAllNotificationsReadController extends Controller<
  'private',
  { marked: number }
> {
  constructor(private readonly markAllRead: MarkAllNotificationsReadUseCase) {
    super();
  }

  protected async handle({
    accountId,
  }: Controller.Request<'private'>): Promise<
    Controller.Response<{ marked: number }>
  > {
    const result = await this.markAllRead.execute({ accountId });

    return { statusCode: 200, body: result };
  }
}
