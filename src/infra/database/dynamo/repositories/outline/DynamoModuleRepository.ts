import { GetCommand } from '@aws-sdk/lib-dynamodb';

import type { UnitOfWork } from '@application/contracts/UnitOfWork';
import type { Course } from '@application/entities/course/Course';
import type { Module } from '@application/entities/outline/Module';
import { ModuleNotEmpty, ModuleNotFound } from '@application/errors/outline';
import type { ModuleRepository } from '@application/repositories/outline/ModuleRepository';
import { dynamoClient } from '@infra/clients/dynamoClient';
import { DynamoUnitOfWork } from '@infra/database/dynamo/DynamoUnitOfWork';
import { ModuleItem } from '@infra/database/dynamo/items/outline/ModuleItem';
import type { AppConfig } from '@shared/config/AppConfig';

export class DynamoModuleRepository implements ModuleRepository {
  constructor(private readonly config: AppConfig) {}

  async findById(courseId: Course.Id, id: Module.Id): Promise<Module | null> {
    const command = new GetCommand({
      TableName: this.config.mainTableName,
      Key: { PK: ModuleItem.getPK(courseId), SK: ModuleItem.getSK(id) },
      ConsistentRead: true,
    });

    const { Item } = await dynamoClient.send(command);

    return Item ? ModuleItem.toEntity(Item as ModuleItem.ItemType) : null;
  }

  createOperation(module: Module): UnitOfWork.Operation {
    return DynamoUnitOfWork.operation({
      Put: {
        TableName: this.config.mainTableName,
        Item: ModuleItem.fromEntity(module).toItem(),
        ConditionExpression: 'attribute_not_exists(PK)',
      },
    });
  }

  renameOperation(module: Module): UnitOfWork.Operation {
    return DynamoUnitOfWork.operation(
      {
        Update: {
          TableName: this.config.mainTableName,
          Key: this.keyOf(module.courseId, module.id),
          UpdateExpression: 'SET title = :title',
          ConditionExpression: 'attribute_exists(PK)',
          ExpressionAttributeValues: { ':title': module.title },
        },
      },
      () => new ModuleNotFound(),
    );
  }

  deleteOperation(module: Module): UnitOfWork.Operation {
    return DynamoUnitOfWork.operation(
      {
        Delete: {
          TableName: this.config.mainTableName,
          Key: this.keyOf(module.courseId, module.id),
          ConditionExpression:
            'attribute_exists(PK) AND (attribute_not_exists(lessonCount) OR lessonCount <= :none)',
          ExpressionAttributeValues: { ':none': 0 },
          ReturnValuesOnConditionCheckFailure: 'ALL_OLD',
        },
      },
      (stored) => (stored ? new ModuleNotEmpty() : new ModuleNotFound()),
    );
  }

  repositionOperation(module: Module, lessonsDelta = 0): UnitOfWork.Operation {
    return DynamoUnitOfWork.operation(
      {
        Update: {
          TableName: this.config.mainTableName,
          Key: this.keyOf(module.courseId, module.id),
          UpdateExpression: 'SET #position = :position ADD lessonCount :delta',
          ConditionExpression: 'attribute_exists(PK)',
          ExpressionAttributeNames: { '#position': 'position' },
          ExpressionAttributeValues: {
            ':position': module.position,
            ':delta': lessonsDelta,
          },
        },
      },
      () => new ModuleNotFound(),
    );
  }

  addLessonsOperation(
    courseId: Course.Id,
    id: Module.Id,
    delta: number,
  ): UnitOfWork.Operation {
    return DynamoUnitOfWork.operation(
      {
        Update: {
          TableName: this.config.mainTableName,
          Key: this.keyOf(courseId, id),
          UpdateExpression: 'ADD lessonCount :delta',
          ConditionExpression: 'attribute_exists(PK)',
          ExpressionAttributeValues: { ':delta': delta },
        },
      },
      () => new ModuleNotFound(),
    );
  }

  private keyOf(courseId: Course.Id, id: Module.Id) {
    return { PK: ModuleItem.getPK(courseId), SK: ModuleItem.getSK(id) };
  }
}
