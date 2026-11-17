import type { z } from 'zod';

import { Controller } from '@application/contracts/Controller';
import { createOrganizationSchema } from '@application/controllers/organization/schemas';
import type { OrganizationSummary } from '@application/queries/organization/OrganizationSummary';
import type { CreateOrganizationUseCase } from '@application/usecases/organization/CreateOrganizationUseCase';

export class CreateOrganizationController extends Controller<
  'private',
  OrganizationSummary
> {
  protected override readonly bodySchema = createOrganizationSchema;

  constructor(private readonly createOrganization: CreateOrganizationUseCase) {
    super();
  }

  protected async handle({
    account,
    body,
  }: Controller.Request<'private', CreateOrganizationController.Body>): Promise<
    Controller.Response<OrganizationSummary>
  > {
    const organization = await this.createOrganization.execute({
      owner: account,
      ...body,
    });

    return { statusCode: 201, body: organization };
  }
}

export namespace CreateOrganizationController {
  export type Body = z.infer<typeof createOrganizationSchema>;
}
