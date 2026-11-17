import { DeleteCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyEventV2WithJWTAuthorizer,
} from 'aws-lambda';
import KSUID from 'ksuid';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { accountWorld } from '@tests/support/accountWorld';

import type { Controller } from '@application/contracts/Controller';
import { OrgController } from '@application/contracts/OrgController';
import { GetOrganizationController } from '@application/controllers/organization/GetOrganizationController';
import type { Account } from '@application/entities/account/Account';
import { Membership } from '@application/entities/organization/Membership';
import { Organization } from '@application/entities/organization/Organization';
import { ResolveCallerUseCase } from '@application/usecases/auth/ResolveCallerUseCase';
import { ResolveMembershipUseCase } from '@application/usecases/organization/ResolveMembershipUseCase';
import { dynamoClient } from '@infra/clients/dynamoClient';
import { MembershipItem } from '@infra/database/dynamo/items/organization/MembershipItem';
import { DynamoMembershipRepository } from '@infra/database/dynamo/repositories/organization/DynamoMembershipRepository';
import { DynamoOrganizationRepository } from '@infra/database/dynamo/repositories/organization/DynamoOrganizationRepository';
import {
  lambdaHttpAdapter,
  lambdaOrgHttpAdapter,
} from '@main/adapters/lambdaHttpAdapter';
import { AppConfig } from '@shared/config/AppConfig';

const config = new AppConfig();
const organizations = new DynamoOrganizationRepository(config);
const resolveMembership = new ResolveMembershipUseCase(
  (orgId) => new DynamoMembershipRepository(config, orgId),
);

class OwnersOnlyController extends OrgController<{ name: string }> {
  protected override readonly orgRoles = ['OWNER'] as const;

  protected override readonly bodySchema = z.object({ name: z.string() });

  protected handle(request: Controller.Request<'org', { name: string }>) {
    return Promise.resolve({ statusCode: 200, body: request.body });
  }
}

let world: ReturnType<typeof accountWorld>;
let resolveCaller: ResolveCallerUseCase;
let ana: Account;
let bia: Account;
let acme: Organization;
let globex: Organization;

const addAccount = async (name: string) => {
  const account = await world.addAccount({ name });
  account.session = { accessJti: `jti-${account.id}`, refreshTokenHash: 'h' };
  await world.save(account);

  return account;
};

const found = async (owner: Account, name: string) => {
  const organization = Organization.create({ owner, name });
  await organizations.create(organization);

  return organization;
};

const putMembership = (
  organization: Organization,
  account: Account,
  role: Membership.Role,
) =>
  dynamoClient.send(
    new PutCommand({
      TableName: config.mainTableName,
      Item: MembershipItem.fromEntity(
        new Membership({
          orgId: organization.id,
          accountId: account.id,
          orgName: organization.name,
          role,
          joinedAt: new Date(),
        }),
      ).toItem(),
    }),
  );

const eventOf = (
  account: Account,
  pathParameters: Record<string, string> | undefined,
  body?: string,
) =>
  ({
    body,
    isBase64Encoded: false,
    pathParameters,
    requestContext: {
      requestId: 'request-1',
      authorizer: {
        jwt: {
          claims: { internalId: account.id, jti: `jti-${account.id}` },
          scopes: [],
        },
      },
    },
  }) as unknown as APIGatewayProxyEventV2WithJWTAuthorizer;

const get = (account: Account, orgId: string) =>
  lambdaOrgHttpAdapter(
    new GetOrganizationController(),
    resolveCaller,
    resolveMembership,
  )(eventOf(account, { orgId }));

const answer = (response: Awaited<ReturnType<typeof get>>) => ({
  statusCode: response.statusCode,
  body: JSON.parse(response.body ?? 'null') as unknown,
});

beforeEach(async () => {
  world = accountWorld();
  resolveCaller = new ResolveCallerUseCase(world.accounts);
  ana = await addAccount('ana');
  bia = await addAccount('bia');
  acme = await found(ana, 'Acme');
  globex = await found(bia, 'Globex');
  await putMembership(globex, ana, 'MEMBER');
});

describe('lambdaOrgHttpAdapter', () => {
  it('should answer the organization in the path with the caller role there', async () => {
    expect(answer(await get(ana, acme.id))).toMatchObject({
      statusCode: 200,
      body: { id: acme.id, name: 'Acme', role: 'OWNER' },
    });
    expect(answer(await get(ana, globex.id))).toMatchObject({
      statusCode: 200,
      body: { id: globex.id, name: 'Globex', role: 'MEMBER' },
    });
  });

  it('should give a non-member the same 403 whether the organization exists or not', async () => {
    const missing = Organization.toId(KSUID.randomSync().string);
    const notAMember = {
      statusCode: 403,
      body: { error: { code: 'NOT_A_MEMBER' } },
    };

    expect(answer(await get(bia, acme.id))).toMatchObject(notAMember);
    expect(answer(await get(bia, missing))).toEqual(
      answer(await get(bia, acme.id)),
    );
  });

  it.each([['not-an-id'], [''], [`${'a'.repeat(27)}' or 1=1`]])(
    'should refuse %j as an organization id',
    async (orgId) => {
      expect(answer(await get(ana, orgId))).toMatchObject({
        statusCode: 400,
        body: { error: { code: 'VALIDATION' } },
      });
    },
  );

  it('should refuse a route without the organization in the path', async () => {
    const response = await lambdaOrgHttpAdapter(
      new GetOrganizationController(),
      resolveCaller,
      resolveMembership,
    )(eventOf(ana, undefined));

    expect(response.statusCode).toBe(400);
  });

  it('should refuse a role before reading the body', async () => {
    const response = await lambdaOrgHttpAdapter(
      new OwnersOnlyController(),
      resolveCaller,
      resolveMembership,
    )(eventOf(ana, { orgId: globex.id }, '{broken'));

    expect(answer(response)).toMatchObject({
      statusCode: 403,
      body: { error: { code: 'FORBIDDEN' } },
    });
  });

  it('should apply a removal and a role change to the next request with the same token', async () => {
    await putMembership(globex, ana, 'ADMIN');
    expect(answer(await get(ana, globex.id))).toMatchObject({
      body: { role: 'ADMIN' },
    });

    await dynamoClient.send(
      new DeleteCommand({
        TableName: config.mainTableName,
        Key: {
          PK: MembershipItem.getPK(globex.id),
          SK: MembershipItem.getSK(ana.id),
        },
      }),
    );
    expect(answer(await get(ana, globex.id))).toMatchObject({
      statusCode: 403,
      body: { error: { code: 'NOT_A_MEMBER' } },
    });
  });

  it('should not take an organization route in the plain adapter', () => {
    const wire = () =>
      lambdaHttpAdapter(
        // @ts-expect-error: the plain adapter loads no membership.
        new GetOrganizationController(),
        resolveCaller,
      );

    expect(wire).toBeTypeOf('function');
  });

  it('should fail loudly when the route has no authorizer', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const response = await lambdaOrgHttpAdapter(
      new GetOrganizationController(),
      resolveCaller,
      resolveMembership,
    )({
      pathParameters: { orgId: acme.id },
      requestContext: { requestId: 'request-1' },
    } as unknown as APIGatewayProxyEventV2);

    expect(response.statusCode).toBe(500);
  });
});
