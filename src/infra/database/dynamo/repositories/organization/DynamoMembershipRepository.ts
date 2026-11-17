import { GetCommand } from '@aws-sdk/lib-dynamodb';

import type { UnitOfWork } from '@application/contracts/UnitOfWork';
import type { Account } from '@application/entities/account/Account';
import type { Membership } from '@application/entities/organization/Membership';
import { Organization } from '@application/entities/organization/Organization';
import type { MembershipRepository } from '@application/repositories/organization/MembershipRepository';
import { dynamoClient } from '@infra/clients/dynamoClient';
import { DynamoUnitOfWork } from '@infra/database/dynamo/DynamoUnitOfWork';
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

  heldOperation(membership: Membership): UnitOfWork.Operation {
    return DynamoUnitOfWork.operation({
      ConditionCheck: {
        TableName: this.config.mainTableName,
        Key: this.keyOf(membership),
        ConditionExpression: '#role = :role',
        ExpressionAttributeNames: { '#role': 'role' },
        ExpressionAttributeValues: { ':role': membership.role },
      },
    });
  }

  changeRoleOperation(
    membership: Membership,
    role: Membership.Role,
  ): UnitOfWork.Operation {
    return DynamoUnitOfWork.operation({
      Update: {
        TableName: this.config.mainTableName,
        Key: this.keyOf(membership),
        UpdateExpression: 'SET #role = :role',
        ConditionExpression: '#role = :read',
        ExpressionAttributeNames: { '#role': 'role' },
        ExpressionAttributeValues: { ':role': role, ':read': membership.role },
      },
    });
  }

  removeOperation(membership: Membership): UnitOfWork.Operation {
    return DynamoUnitOfWork.operation({
      Delete: {
        TableName: this.config.mainTableName,
        Key: this.keyOf(membership),
        ConditionExpression: '#role = :read',
        ExpressionAttributeNames: { '#role': 'role' },
        ExpressionAttributeValues: { ':read': membership.role },
      },
    });
  }

  private keyOf(membership: Membership) {
    if (membership.orgId !== this.orgId) {
      throw new Error('The membership belongs to another organization.');
    }

    return {
      PK: MembershipItem.getPK(this.orgId),
      SK: MembershipItem.getSK(membership.accountId),
    };
  }
}
