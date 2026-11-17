import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyStructuredResultV2,
} from 'aws-lambda';
import { ZodError } from 'zod';

import type { Controller } from '@application/contracts/Controller';
import type { OrgController } from '@application/contracts/OrgController';
import { orgIdParamsSchema } from '@application/controllers/organization/schemas';
import type { Account } from '@application/entities/account/Account';
import { InvalidSession } from '@application/errors/auth';
import { ApplicationError } from '@application/errors/shared/ApplicationError';
import { ErrorCode } from '@application/errors/shared/ErrorCode';
import type { ResolveCallerUseCase } from '@application/usecases/auth/ResolveCallerUseCase';
import type { ResolveMembershipUseCase } from '@application/usecases/organization/ResolveMembershipUseCase';
import { lambdaBodyParser } from '@main/utils/lambdaBodyParser';
import { lambdaErrorResponse } from '@main/utils/lambdaErrorResponse';

type Event = APIGatewayProxyEventV2 | APIGatewayProxyEventV2WithJWTAuthorizer;

type Handler = (event: Event) => Promise<APIGatewayProxyStructuredResultV2>;

// An OrgController is structurally a private controller; this keeps it to lambdaOrgHttpAdapter,
// which loads the membership it reads.
interface NotOrg {
  authorizeMember?: never;
}

export function lambdaHttpAdapter(
  controller: Controller<'public', unknown> & NotOrg,
): Handler;
export function lambdaHttpAdapter(
  controller: Controller<'private', unknown> & NotOrg,
  resolveCaller: ResolveCallerUseCase,
): Handler;
export function lambdaHttpAdapter(
  controller: Controller<Controller.RouteType, unknown>,
  resolveCaller?: ResolveCallerUseCase,
): Handler {
  return (event) =>
    respond(event, async () => {
      const caller = await lambdaCaller(event, resolveCaller);
      // A caller without the permission is told so, whatever the body holds.
      controller.authorize(caller.role);

      return controller.execute({ ...caller, ...lambdaRequest(event) });
    });
}

// The organization comes from the path and the membership from the table, read for this
// caller on every request: never from the token or the body.
export function lambdaOrgHttpAdapter(
  controller: OrgController<unknown>,
  resolveCaller: ResolveCallerUseCase,
  resolveMembership: ResolveMembershipUseCase,
): Handler {
  return (event) =>
    respond(event, async () => {
      const caller = await lambdaCaller(event, resolveCaller);

      if (!caller.accountId) {
        throw new Error('An organization route needs the authorizer.');
      }

      const { orgId } = orgIdParamsSchema.parse(event.pathParameters ?? {});
      const membership = await resolveMembership.execute({
        orgId,
        accountId: caller.accountId,
      });
      controller.authorize(caller.role);
      controller.authorizeMember(membership.role);

      return controller.execute({
        ...caller,
        membership,
        ...lambdaRequest(event),
      });
    });
}

async function respond(
  event: Event,
  run: () => Promise<Controller.Response<unknown>>,
): Promise<APIGatewayProxyStructuredResultV2> {
  try {
    const { statusCode, body, cookies } = await run();

    return {
      statusCode,
      headers: { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      ...(cookies ? { cookies } : {}),
    };
  } catch (error) {
    if (error instanceof ZodError) {
      return lambdaErrorResponse(
        400,
        ErrorCode.Validation,
        'The request is not valid.',
        error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      );
    }

    if (error instanceof ApplicationError) {
      return lambdaErrorResponse(error.statusCode, error.code, error.message);
    }

    console.error({
      requestId: event.requestContext.requestId,
      error:
        error instanceof Error
          ? { name: error.name, message: error.message, stack: error.stack }
          : String(error),
    });

    return lambdaErrorResponse(
      500,
      ErrorCode.InternalServerError,
      'Internal server error.',
    );
  }
}

function lambdaRequest(event: Event) {
  return {
    body: lambdaBodyParser(event.body, event.isBase64Encoded) as Record<
      string,
      unknown
    >,
    params: event.pathParameters ?? {},
    queryParams: event.queryStringParameters ?? {},
    headers: lambdaHeaders(event.headers),
    cookies: lambdaCookies(event.cookies),
  };
}

type Caller =
  | { accountId: Account.Id; role: Account.Role; account: Account }
  | { accountId: null; role: null; account: null };

async function lambdaCaller(
  event: Event,
  resolveCaller: ResolveCallerUseCase | undefined,
): Promise<Caller> {
  if (!('authorizer' in event.requestContext)) {
    return { accountId: null, role: null, account: null };
  }

  if (!resolveCaller) {
    throw new Error('A private route needs a caller resolver.');
  }

  const { internalId, jti } = event.requestContext.authorizer.jwt.claims;

  if (
    typeof internalId !== 'string' ||
    internalId === '' ||
    typeof jti !== 'string'
  ) {
    throw new InvalidSession();
  }

  const account = await resolveCaller.execute({
    accountId: internalId,
    accessJti: jti,
  });

  return { accountId: account.id, role: account.role, account };
}

// The HTTP API already lowercases the names; a header without a value is left out. An event
// invoked by hand may come without headers at all.
function lambdaHeaders(
  headers: Event['headers'] | undefined,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(headers ?? {}).flatMap(([name, value]) =>
      value === undefined ? [] : [[name.toLowerCase(), value]],
    ),
  );
}

// The HTTP API sends each cookie as `name=value`; a repeated name keeps the first.
function lambdaCookies(cookies: string[] | undefined): Record<string, string> {
  const pairs = (cookies ?? []).flatMap((cookie): [string, string][] => {
    const separator = cookie.indexOf('=');

    return separator > 0
      ? [[cookie.slice(0, separator).trim(), cookie.slice(separator + 1)]]
      : [];
  });

  return Object.fromEntries(pairs.reverse());
}
