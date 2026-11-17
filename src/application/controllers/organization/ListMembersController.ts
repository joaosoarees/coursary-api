import type { z } from 'zod';

import type { Controller } from '@application/contracts/Controller';
import { OrgController } from '@application/contracts/OrgController';
import type { Page } from '@application/contracts/Page';
import { paginationSchema } from '@application/controllers/shared/schemas';
import type { MemberSummary } from '@application/queries/organization/MemberSummary';
import type { ListMembersUseCase } from '@application/usecases/organization/ListMembersUseCase';

export class ListMembersController extends OrgController<Page<MemberSummary>> {
  protected override readonly orgRoles = ['OWNER', 'ADMIN'] as const;

  protected override readonly queryParamsSchema = paginationSchema;

  constructor(private readonly listMembers: ListMembersUseCase) {
    super();
  }

  protected async handle({
    membership,
    queryParams,
  }: Controller.Request<
    'org',
    Record<string, unknown>,
    Record<string, unknown>,
    ListMembersController.QueryParams
  >): Promise<Controller.Response<Page<MemberSummary>>> {
    const page = await this.listMembers.execute({
      actor: membership,
      ...queryParams,
    });

    return { statusCode: 200, body: page };
  }
}

export namespace ListMembersController {
  export type QueryParams = z.infer<typeof paginationSchema>;
}
