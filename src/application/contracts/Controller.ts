import type { ZodType } from 'zod';

import type { Account } from '@application/entities/account/Account';
import { Forbidden } from '@application/errors/common';
import {
  type Permission,
  Permissions,
} from '@application/security/permissions';

export abstract class Controller<
  TType extends Controller.RouteType,
  TResponse = undefined,
> {
  protected readonly permission: Permission | undefined = undefined;

  protected readonly paramsSchema: ZodType | undefined = undefined;

  protected readonly queryParamsSchema: ZodType | undefined = undefined;

  protected readonly bodySchema: ZodType | undefined = undefined;

  protected abstract handle(
    request: Controller.Request<TType>,
  ): Promise<Controller.Response<TResponse>>;

  async execute(
    request: Controller.Request<TType>,
  ): Promise<Controller.Response<TResponse>> {
    this.authorize(request.role);

    return this.handle({
      ...request,
      params: Controller.parse(this.paramsSchema, request.params),
      queryParams: Controller.parse(
        this.queryParamsSchema,
        request.queryParams,
      ),
      body: Controller.parse(this.bodySchema, request.body),
    });
  }

  private authorize(role: Account.Role | null): void {
    if (!this.permission) {
      return;
    }

    if (!role || !Permissions.allows(role, this.permission)) {
      throw new Forbidden();
    }
  }

  private static parse<TValue>(
    schema: ZodType | undefined,
    value: TValue,
  ): TValue {
    return (schema ? schema.parse(value) : value) as TValue;
  }
}

export namespace Controller {
  export type RouteType = 'public' | 'private';

  interface BaseRequest<TBody, TParams, TQueryParams> {
    body: TBody;
    params: TParams;
    queryParams: TQueryParams;
  }

  export type Request<
    TType extends RouteType,
    TBody = Record<string, unknown>,
    TParams = Record<string, unknown>,
    TQueryParams = Record<string, unknown>,
  > = BaseRequest<TBody, TParams, TQueryParams> &
    (TType extends 'private'
      ? { accountId: Account.Id; role: Account.Role; account: Account }
      : { accountId: null; role: null; account: null });

  export interface Response<TBody> {
    statusCode: number;
    body?: TBody;
  }
}
