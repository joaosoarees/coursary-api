import type { z } from 'zod';

import { Controller } from '@application/contracts/Controller';
import { ticketBodySchema } from '@application/controllers/realtime/schemas';
import { permissions } from '@application/security/permissions';
import type { IssueRealtimeTicketUseCase } from '@application/usecases/realtime/IssueRealtimeTicketUseCase';

export class IssueRealtimeTicketController extends Controller<
  'private',
  IssueRealtimeTicketUseCase.Output
> {
  protected override readonly permission = permissions.CoursesLearn;

  protected override readonly bodySchema = ticketBodySchema;

  constructor(private readonly issueTicket: IssueRealtimeTicketUseCase) {
    super();
  }

  protected async handle({
    accountId,
    role,
    body,
  }: Controller.Request<
    'private',
    IssueRealtimeTicketController.Body
  >): Promise<Controller.Response<IssueRealtimeTicketUseCase.Output>> {
    const ticket = await this.issueTicket.execute({
      callerId: accountId,
      callerRole: role,
      lesson: body.lesson,
    });

    return { statusCode: 201, body: ticket };
  }
}

export namespace IssueRealtimeTicketController {
  export type Body = z.infer<typeof ticketBodySchema>;
}
