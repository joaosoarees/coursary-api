import { PutCommand } from '@aws-sdk/lib-dynamodb';

import type { UnitOfWork } from '@application/contracts/UnitOfWork';
import type { CoursePosition } from '@application/entities/enrollment/CoursePosition';
import type { LessonProgress } from '@application/entities/enrollment/LessonProgress';
import { AlreadyCompleted } from '@application/errors/enrollment';
import type { ProgressRepository } from '@application/repositories/enrollment/ProgressRepository';
import { dynamoClient } from '@infra/clients/dynamoClient';
import { DynamoUnitOfWork } from '@infra/database/dynamo/DynamoUnitOfWork';
import { CoursePositionItem } from '@infra/database/dynamo/items/enrollment/CoursePositionItem';
import { LessonProgressItem } from '@infra/database/dynamo/items/enrollment/LessonProgressItem';
import type { AppConfig } from '@shared/config/AppConfig';

export class DynamoProgressRepository implements ProgressRepository {
  constructor(private readonly config: AppConfig) {}

  completeOperation(progress: LessonProgress): UnitOfWork.Operation {
    return DynamoUnitOfWork.operation(
      {
        Put: {
          TableName: this.config.mainTableName,
          Item: LessonProgressItem.fromEntity(progress).toItem(),
          ConditionExpression: 'attribute_not_exists(PK)',
        },
      },
      () => new AlreadyCompleted(),
    );
  }

  async savePosition(position: CoursePosition): Promise<void> {
    const command = new PutCommand({
      TableName: this.config.mainTableName,
      Item: CoursePositionItem.fromEntity(position).toItem(),
    });

    await dynamoClient.send(command);
  }
}
