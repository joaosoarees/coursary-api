import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

import type { UnitOfWork } from '@application/contracts/UnitOfWork';
import { type File, fileStatuses } from '@application/entities/file/File';
import type { FileRepository } from '@application/repositories/file/FileRepository';
import { dynamoClient } from '@infra/clients/dynamoClient';
import { DynamoUnitOfWork } from '@infra/database/dynamo/DynamoUnitOfWork';
import { FileItem } from '@infra/database/dynamo/items/file/FileItem';
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
