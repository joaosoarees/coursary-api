import { GetCommand } from '@aws-sdk/lib-dynamodb';

import type { Account } from '@application/entities/account/Account';
import type { Membership } from '@application/entities/organization/Membership';
import { Organization } from '@application/entities/organization/Organization';
import type { MembershipRepository } from '@application/repositories/organization/MembershipRepository';
import { dynamoClient } from '@infra/clients/dynamoClient';
import { MembershipItem } from '@infra/database/dynamo/items/organization/MembershipItem';
import type { AppConfig } from '@shared/config/AppConfig';

export class DynamoMembershipRepository implements MembershipRepository {
  constructor(
    private readonly config: AppConfig,
    private readonly orgId: Organization.Id,
  ) {
    // A bug in the caller, never an empty key: the type alone does not stop a cast or undefined.
    if (!Organization.isId(orgId)) {
      throw new TypeError('A membership repository needs an organization id.');
    }
  }

  // Strong: a removal or a role change applies to the very next request.
  async find(accountId: Account.Id): Promise<Membership | null> {
    const { Item } = await dynamoClient.send(
      new GetCommand({
        TableName: this.config.mainTableName,
        Key: {
          PK: MembershipItem.getPK(this.orgId),
          SK: MembershipItem.getSK(accountId),
        },
        ConsistentRead: true,
      }),
    );

    return Item
      ? MembershipItem.toEntity(Item as MembershipItem.ItemType)
      : null;
  }
}
