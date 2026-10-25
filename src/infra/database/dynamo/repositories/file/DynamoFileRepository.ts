import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';

import type { UnitOfWork } from '@application/contracts/UnitOfWork';
import { type File, fileStatuses } from '@application/entities/file/File';
import type { FileRepository } from '@application/repositories/file/FileRepository';
import { dynamoClient } from '@infra/clients/dynamoClient';
import { DynamoUnitOfWork } from '@infra/database/dynamo/DynamoUnitOfWork';
import { FileItem } from '@infra/database/dynamo/items/file/FileItem';
import { nowInSeconds } from '@infra/database/dynamo/ttl';
import type { AppConfig } from '@shared/config/AppConfig';

export class DynamoFileRepository implements FileRepository {
  constructor(private readonly config: AppConfig) {}

  async create(file: File): Promise<void> {
    const command = new PutCommand({
      TableName: this.config.mainTableName,
      Item: FileItem.fromEntity(file).toItem(),
      ConditionExpression: 'attribute_not_exists(PK)',
    });

    await dynamoClient.send(command);
  }

  async find(reference: File.Reference): Promise<File | null> {
    const command = new GetCommand({
      TableName: this.config.mainTableName,
      Key: this.keyOf(reference),
      ConsistentRead: true,
    });

    const { Item } = await dynamoClient.send(command);

    return Item ? FileItem.toEntity(Item as FileItem.ItemType) : null;
  }

  // Strong, and without the pending ones whose time ran out but DynamoDB has not deleted yet.
  async listByOwner(
    owner: Pick<File.Reference, 'ownerType' | 'ownerId'>,
    purpose: File.Purpose,
  ): Promise<File[]> {
    const command = new QueryCommand({
      TableName: this.config.mainTableName,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      ExpressionAttributeValues: {
        ':pk': FileItem.getPK(owner),
        ':prefix': `FILE#${purpose}#`,
      },
      ConsistentRead: true,
    });

    const { Items = [] } = await dynamoClient.send(command);
    const now = nowInSeconds();

    return (Items as FileItem.ItemType[])
      .filter((item) => item.expiresAt === undefined || item.expiresAt >= now)
      .map((item) => FileItem.toEntity(item));
  }

  // Only from PENDING; does nothing when the file already left it.
  async markUploaded(file: File): Promise<void> {
    const command = new UpdateCommand({
      TableName: this.config.mainTableName,
      Key: this.keyOf(file),
      UpdateExpression:
        'SET #status = :uploaded, #size = :size REMOVE expiresAt',
      ConditionExpression: '#status = :pending',
      ExpressionAttributeNames: { '#status': 'status', '#size': 'size' },
      ExpressionAttributeValues: {
        ':uploaded': fileStatuses.Uploaded,
        ':pending': fileStatuses.Pending,
        ':size': file.size,
      },
    });

    try {
      await dynamoClient.send(command);
    } catch (error) {
      if (!(error instanceof ConditionalCheckFailedException)) {
        throw error;
      }
    }
  }

  // False when there was nothing to delete.
  async delete(reference: File.Reference): Promise<boolean> {
    const command = new DeleteCommand({
      TableName: this.config.mainTableName,
      Key: this.keyOf(reference),
      ConditionExpression: 'attribute_exists(PK)',
    });

    try {
      await dynamoClient.send(command);
      return true;
    } catch (error) {
      if (error instanceof ConditionalCheckFailedException) {
        return false;
      }

      throw error;
    }
  }

  // Only on a file that was sent; a conflict means it was deleted meanwhile.
  setPositionOperation(
    reference: File.Reference,
    position: number,
  ): UnitOfWork.Operation {
    return DynamoUnitOfWork.operation({
      Update: {
        TableName: this.config.mainTableName,
        Key: this.keyOf(reference),
        UpdateExpression: 'SET #position = :position',
        ConditionExpression: '#status = :uploaded',
        ExpressionAttributeNames: {
          '#position': 'position',
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':position': position,
          ':uploaded': fileStatuses.Uploaded,
        },
      },
    });
  }

  markProcessedOperation(file: File): UnitOfWork.Operation {
    return DynamoUnitOfWork.operation({
      Update: {
        TableName: this.config.mainTableName,
        Key: this.keyOf(file),
        UpdateExpression:
          'SET #status = :processed, #size = :size, variants = :variants REMOVE expiresAt',
        ConditionExpression: '#status = :pending',
        ExpressionAttributeNames: { '#status': 'status', '#size': 'size' },
        ExpressionAttributeValues: {
          ':processed': fileStatuses.Processed,
          ':pending': fileStatuses.Pending,
          ':size': file.size,
          ':variants': file.variants,
        },
      },
    });
  }

  deleteOperation(reference: File.Reference): UnitOfWork.Operation {
    return DynamoUnitOfWork.operation({
      Delete: {
        TableName: this.config.mainTableName,
        Key: this.keyOf(reference),
      },
    });
  }

  // Kept for a day, like a pending one: the owner sees nothing either way.
  async markFailed(file: File): Promise<void> {
    const command = new UpdateCommand({
      TableName: this.config.mainTableName,
      Key: this.keyOf(file),
      UpdateExpression: 'SET #status = :failed, #size = :size',
      ConditionExpression: '#status = :pending',
      ExpressionAttributeNames: { '#status': 'status', '#size': 'size' },
      ExpressionAttributeValues: {
        ':failed': fileStatuses.Failed,
        ':pending': fileStatuses.Pending,
        ':size': file.size,
      },
    });

    try {
      await dynamoClient.send(command);
    } catch (error) {
      if (!(error instanceof ConditionalCheckFailedException)) {
        throw error;
      }
    }
  }

  private keyOf(reference: File.Reference) {
    return { PK: FileItem.getPK(reference), SK: FileItem.getSK(reference) };
  }
}
