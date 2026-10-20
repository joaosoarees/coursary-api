import {
  ConditionalCheckFailedException,
  TransactionCanceledException,
} from '@aws-sdk/client-dynamodb';
import {
  DeleteCommand,
  GetCommand,
  TransactWriteCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';

import {
  Account,
  accountRoles,
  accountStatuses,
} from '@application/entities/account/Account';
import type { RoleChange } from '@application/entities/account/RoleChange';
import { AccountConflict } from '@application/errors/account';
import { EmailInUse, InvalidSession } from '@application/errors/auth';
import { Forbidden } from '@application/errors/common';
import type { AccountRepository } from '@application/repositories/account/AccountRepository';
import { dynamoClient } from '@infra/clients/dynamoClient';
import { AccountItem } from '@infra/database/dynamo/items/account/AccountItem';
import { EmailClaimItem } from '@infra/database/dynamo/items/account/EmailClaimItem';
import { RoleChangeItem } from '@infra/database/dynamo/items/account/RoleChangeItem';
import { nowInSeconds } from '@infra/database/dynamo/ttl';
import type { AppConfig } from '@shared/config/AppConfig';

export class DynamoAccountRepository implements AccountRepository {
  constructor(private readonly config: AppConfig) {}

  async create(account: Account): Promise<void> {
    const TableName = this.config.mainTableName;
    const accountItem = AccountItem.fromEntity(account);
    const emailClaimItem = EmailClaimItem.fromEntity(account);

    try {
      const command = new TransactWriteCommand({
        TransactItems: [
          {
            Put: {
              TableName,
              Item: accountItem.toItem(),
              ConditionExpression: 'attribute_not_exists(PK)',
            },
          },
          {
            Put: {
              TableName,
              Item: emailClaimItem.toItem(),
              ConditionExpression:
                'attribute_not_exists(PK) OR expiresAt < :now',
              ExpressionAttributeValues: {
                ':now': nowInSeconds(),
              },
            },
          },
        ],
      });

      await dynamoClient.send(command);
    } catch (error) {
      const claimFailed =
        error instanceof TransactionCanceledException &&
        error.CancellationReasons?.[1]?.Code === 'ConditionalCheckFailed';

      if (claimFailed) {
        throw new EmailInUse();
      }

      throw error;
    }
  }

  // Undoes a sign-up: the account always goes; the e-mail claim only while it
  // is still this account's, since an expired claim may have been taken (Q132).
  async delete(account: Account): Promise<void> {
    const TableName = this.config.mainTableName;
    const deleteAccount = new DeleteCommand({
      TableName,
      Key: this.keyOf(account.id),
    });
    const deleteClaim = new DeleteCommand({
      TableName,
      Key: {
        PK: EmailClaimItem.getPK(account.email),
        SK: EmailClaimItem.getSK(account.email),
      },
      ConditionExpression: 'accountId = :accountId',
      ExpressionAttributeValues: { ':accountId': account.id },
    });

    await dynamoClient.send(deleteAccount);

    try {
      await dynamoClient.send(deleteClaim);
    } catch (error) {
      if (!(error instanceof ConditionalCheckFailedException)) {
        throw error;
      }
    }
  }

  async saveExternalId(account: Account): Promise<void> {
    const command = new UpdateCommand({
      TableName: this.config.mainTableName,
      Key: this.keyOf(account.id),
      UpdateExpression: 'SET externalId = :externalId',
      ConditionExpression: 'attribute_exists(PK)',
      ExpressionAttributeValues: { ':externalId': account.externalId },
    });

    await dynamoClient.send(command);
  }

  async findById(
    id: Account.Id,
    { consistent = true }: AccountRepository.ReadOptions = {},
  ): Promise<Account | null> {
    const item = await this.getLive<AccountItem.ItemType>(
      this.keyOf(id),
      consistent,
    );

    return item ? AccountItem.toEntity(item) : null;
  }

  async findByEmail(email: string): Promise<Account | null> {
    const normalized = Account.normalizeEmail(email);
    const claim = await this.getLive<EmailClaimItem.ItemType>({
      PK: EmailClaimItem.getPK(normalized),
      SK: EmailClaimItem.getSK(normalized),
    });

    return claim ? this.findById(claim.accountId) : null;
  }

  async activate(account: Account): Promise<void> {
    const TableName = this.config.mainTableName;

    const command = new TransactWriteCommand({
      TransactItems: [
        {
          Update: {
            TableName,
            Key: this.keyOf(account.id),
            UpdateExpression: 'SET #status = :status REMOVE expiresAt',
            ConditionExpression: '#status = :pending',
            ExpressionAttributeNames: { '#status': 'status' },
            ExpressionAttributeValues: {
              ':status': account.status,
              ':pending': accountStatuses.Pending,
            },
          },
        },
        {
          Update: {
            TableName,
            Key: {
              PK: EmailClaimItem.getPK(account.email),
              SK: EmailClaimItem.getSK(account.email),
            },
            UpdateExpression: 'REMOVE expiresAt',
            ConditionExpression: 'accountId = :accountId',
            ExpressionAttributeValues: { ':accountId': account.id },
          },
        },
      ],
    });

    await dynamoClient.send(command);
  }

  async updateName(id: Account.Id, name: string): Promise<Account> {
    const command = new UpdateCommand({
      TableName: this.config.mainTableName,
      Key: this.keyOf(id),
      UpdateExpression: 'SET #name = :name',
      ConditionExpression: 'attribute_exists(PK)',
      ExpressionAttributeNames: { '#name': 'name' },
      ExpressionAttributeValues: { ':name': name },
      ReturnValues: 'ALL_NEW',
    });

    const { Attributes } = await dynamoClient.send(command);

    return AccountItem.toEntity(Attributes as AccountItem.ItemType);
  }

  async changeRole(
    roleChange: RoleChange,
    { adminCallerId }: AccountRepository.ChangeRoleOptions = {},
  ): Promise<void> {
    const TableName = this.config.mainTableName;
    const roleChangeItem = RoleChangeItem.fromEntity(roleChange);
    const callerCheck = adminCallerId
      ? [this.adminCallerCheck(adminCallerId)]
      : [];

    const command = new TransactWriteCommand({
      TransactItems: [
        {
          Update: {
            TableName,
            Key: this.keyOf(roleChange.accountId),
            UpdateExpression: 'SET #role = :toRole, GSI1PK = :gsi1pk',
            ConditionExpression: '#status = :active AND #role = :fromRole',
            ExpressionAttributeNames: {
              '#role': 'role',
              '#status': 'status',
            },
            ExpressionAttributeValues: {
              ':toRole': roleChange.toRole,
              ':fromRole': roleChange.fromRole,
              ':gsi1pk': AccountItem.getGSI1PK(roleChange.toRole),
              ':active': accountStatuses.Active,
            },
          },
        },
        {
          Put: {
            TableName,
            Item: roleChangeItem.toItem(),
            ConditionExpression: 'attribute_not_exists(PK)',
          },
        },
        ...callerCheck,
      ],
    });

    await DynamoAccountRepository.sendAdminChange(command, 2);
  }

  async saveSession(
    accountId: Account.Id,
    session: Account.Session,
  ): Promise<void> {
    const command = new UpdateCommand({
      TableName: this.config.mainTableName,
      Key: this.keyOf(accountId),
      UpdateExpression: 'SET #session = :session',
      ConditionExpression: 'attribute_exists(PK)',
      ExpressionAttributeNames: { '#session': 'session' },
      ExpressionAttributeValues: { ':session': session },
    });

    await dynamoClient.send(command);
  }

  async rotateSession(
    accountId: Account.Id,
    previousRefreshTokenHash: string,
    session: Account.Session,
  ): Promise<void> {
    const command = new UpdateCommand({
      TableName: this.config.mainTableName,
      Key: this.keyOf(accountId),
      UpdateExpression: 'SET #session = :session',
      ConditionExpression: '#session.refreshTokenHash = :previous',
      ExpressionAttributeNames: { '#session': 'session' },
      ExpressionAttributeValues: {
        ':session': session,
        ':previous': previousRefreshTokenHash,
      },
    });

    try {
      await dynamoClient.send(command);
    } catch (error) {
      if (error instanceof ConditionalCheckFailedException) {
        throw new InvalidSession();
      }

      throw error;
    }
  }

  async clearSession(accountId: Account.Id): Promise<void> {
    const command = new UpdateCommand({
      TableName: this.config.mainTableName,
      Key: this.keyOf(accountId),
      UpdateExpression: 'REMOVE #session',
      ConditionExpression: 'attribute_exists(PK)',
      ExpressionAttributeNames: { '#session': 'session' },
    });

    await dynamoClient.send(command);
  }

  async changeStatus(
    { accountId, fromStatus, toStatus }: AccountRepository.StatusChange,
    adminCallerId: Account.Id,
  ): Promise<void> {
    const command = new TransactWriteCommand({
      TransactItems: [
        {
          Update: {
            TableName: this.config.mainTableName,
            Key: this.keyOf(accountId),
            UpdateExpression:
              toStatus === accountStatuses.Disabled
                ? 'SET #status = :toStatus REMOVE #session'
                : 'SET #status = :toStatus',
            ConditionExpression: '#status = :fromStatus',
            ExpressionAttributeNames:
              toStatus === accountStatuses.Disabled
                ? { '#status': 'status', '#session': 'session' }
                : { '#status': 'status' },
            ExpressionAttributeValues: {
              ':toStatus': toStatus,
              ':fromStatus': fromStatus,
            },
          },
        },
        this.adminCallerCheck(adminCallerId),
      ],
    });

    await DynamoAccountRepository.sendAdminChange(command, 1);
  }

  private adminCallerCheck(adminCallerId: Account.Id) {
    return {
      ConditionCheck: {
        TableName: this.config.mainTableName,
        Key: this.keyOf(adminCallerId),
        ConditionExpression: '#role = :admin AND #status = :active',
        ExpressionAttributeNames: { '#role': 'role', '#status': 'status' },
        ExpressionAttributeValues: {
          ':admin': accountRoles.Admin,
          ':active': accountStatuses.Active,
        },
      },
    };
  }

  private static async sendAdminChange(
    command: TransactWriteCommand,
    callerCheckIndex: number,
  ): Promise<void> {
    try {
      await dynamoClient.send(command);
    } catch (error) {
      if (!(error instanceof TransactionCanceledException)) {
        throw error;
      }

      const callerFailed =
        error.CancellationReasons?.[callerCheckIndex]?.Code ===
        'ConditionalCheckFailed';

      throw callerFailed ? new Forbidden() : new AccountConflict();
    }
  }

  private keyOf(id: Account.Id) {
    return { PK: AccountItem.getPK(id), SK: AccountItem.getSK(id) };
  }

  private async getLive<TItem extends { expiresAt?: number }>(
    Key: Record<string, string>,
    consistent = true,
  ): Promise<TItem | null> {
    const getCommand = new GetCommand({
      TableName: this.config.mainTableName,
      Key,
      ConsistentRead: consistent,
    });

    const { Item } = await dynamoClient.send(getCommand);
    const item = Item as TItem | undefined;

    if (!item || (item.expiresAt && item.expiresAt < nowInSeconds())) {
      return null;
    }

    return item;
  }
}
