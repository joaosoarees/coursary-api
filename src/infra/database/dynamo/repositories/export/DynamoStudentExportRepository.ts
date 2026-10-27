import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

import type { UnitOfWork } from '@application/contracts/UnitOfWork';
import {
  exportStatuses,
  type StudentExport,
} from '@application/entities/export/StudentExport';
import type { StudentExportRepository } from '@application/repositories/export/StudentExportRepository';
import { dynamoClient } from '@infra/clients/dynamoClient';
import { DynamoUnitOfWork } from '@infra/database/dynamo/DynamoUnitOfWork';
import { StudentExportItem } from '@infra/database/dynamo/items/export/StudentExportItem';
import type { AppConfig } from '@shared/config/AppConfig';

export class DynamoStudentExportRepository implements StudentExportRepository {
  constructor(private readonly config: AppConfig) {}

  createOperation(studentExport: StudentExport): UnitOfWork.Operation {
    return DynamoUnitOfWork.operation({
      Put: {
        TableName: this.config.mainTableName,
        Item: StudentExportItem.fromEntity(studentExport).toItem(),
        ConditionExpression: 'attribute_not_exists(PK)',
      },
    });
  }

  async find(id: StudentExport.Id): Promise<StudentExport | null> {
    const command = new GetCommand({
      TableName: this.config.mainTableName,
      Key: this.keyOf(id),
      ConsistentRead: true,
    });

    const { Item } = await dynamoClient.send(command);

    return Item
      ? StudentExportItem.toEntity(Item as StudentExportItem.ItemType)
      : null;
  }

  async markReady(studentExport: StudentExport): Promise<void> {
    const command = new UpdateCommand({
      TableName: this.config.mainTableName,
      Key: this.keyOf(studentExport.id),
      UpdateExpression: 'SET #status = :ready, rowCount = :rowCount',
      ConditionExpression: '#status = :pending',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':ready': exportStatuses.Ready,
        ':pending': exportStatuses.Pending,
        ':rowCount': studentExport.rowCount ?? 0,
      },
    });

    await this.ignoringLeft(command);
  }

  async markFailed(studentExport: StudentExport): Promise<void> {
    const command = new UpdateCommand({
      TableName: this.config.mainTableName,
      Key: this.keyOf(studentExport.id),
      UpdateExpression: 'SET #status = :failed',
      ConditionExpression: '#status = :pending',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':failed': exportStatuses.Failed,
        ':pending': exportStatuses.Pending,
      },
    });

    await this.ignoringLeft(command);
  }

  // The export already left PENDING: a repeated message, nothing to change.
  private async ignoringLeft(command: UpdateCommand): Promise<void> {
    try {
      await dynamoClient.send(command);
    } catch (error) {
      if (!(error instanceof ConditionalCheckFailedException)) {
        throw error;
      }
    }
  }

  private keyOf(id: StudentExport.Id) {
    return {
      PK: StudentExportItem.getPK(id),
      SK: StudentExportItem.getSK(id),
    };
  }
}
