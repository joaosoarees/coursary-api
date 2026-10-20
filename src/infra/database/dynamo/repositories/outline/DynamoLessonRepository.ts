import { GetCommand } from '@aws-sdk/lib-dynamodb';

import type { UnitOfWork } from '@application/contracts/UnitOfWork';
import type { Course } from '@application/entities/course/Course';
import { Lesson } from '@application/entities/outline/Lesson';
import type { Module } from '@application/entities/outline/Module';
import { LessonNotFound } from '@application/errors/outline';
import type { LessonRepository } from '@application/repositories/outline/LessonRepository';
import { dynamoClient } from '@infra/clients/dynamoClient';
import { DynamoUnitOfWork } from '@infra/database/dynamo/DynamoUnitOfWork';
import { LessonContentItem } from '@infra/database/dynamo/items/outline/LessonContentItem';
import { LessonItem } from '@infra/database/dynamo/items/outline/LessonItem';
import type { AppConfig } from '@shared/config/AppConfig';

export class DynamoLessonRepository implements LessonRepository {
  constructor(private readonly config: AppConfig) {}

  async findById(
    courseId: Course.Id,
    moduleId: Module.Id,
    id: Lesson.Id,
  ): Promise<Lesson | null> {
    const TableName = this.config.mainTableName;
    const summaryCommand = new GetCommand({
      TableName,
      Key: {
        PK: LessonItem.getPK(courseId),
        SK: LessonItem.getSK(moduleId, id),
      },
    });
    const contentCommand = new GetCommand({
      TableName,
      Key: {
        PK: LessonContentItem.getPK(id),
        SK: LessonContentItem.getSK(),
      },
    });

    const [summary, content] = await Promise.all([
      dynamoClient.send(summaryCommand),
      dynamoClient.send(contentCommand),
    ]);
    const item = summary.Item as LessonItem.ItemType | undefined;
    const contentItem = content.Item as LessonContentItem.ItemType | undefined;

    return item
      ? new Lesson({
          id: item.id,
          courseId: item.courseId,
          moduleId: item.moduleId,
          title: item.title,
          body: contentItem?.body ?? '',
          durationMinutes: item.durationMinutes,
          position: item.position,
        })
      : null;
  }

  async findContent(
    courseId: Course.Id,
    id: Lesson.Id,
  ): Promise<LessonRepository.Content | null> {
    const command = new GetCommand({
      TableName: this.config.mainTableName,
      Key: { PK: LessonContentItem.getPK(id), SK: LessonContentItem.getSK() },
    });

    const { Item } = await dynamoClient.send(command);
    const item = Item as LessonContentItem.ItemType | undefined;

    return item?.courseId === courseId
      ? { lessonId: item.id, courseId: item.courseId, body: item.body }
      : null;
  }

  inCourseOperation(courseId: Course.Id, id: Lesson.Id): UnitOfWork.Operation {
    return DynamoUnitOfWork.operation(
      {
        ConditionCheck: {
          TableName: this.config.mainTableName,
          Key: {
            PK: LessonContentItem.getPK(id),
            SK: LessonContentItem.getSK(),
          },
          ConditionExpression: 'courseId = :courseId',
          ExpressionAttributeValues: { ':courseId': courseId },
        },
      },
      () => new LessonNotFound(),
    );
  }

  createOperations(lesson: Lesson): UnitOfWork.Operation[] {
    const TableName = this.config.mainTableName;

    return [
      DynamoUnitOfWork.operation({
        Put: {
          TableName,
          Item: LessonItem.fromEntity(lesson).toItem(),
          ConditionExpression: 'attribute_not_exists(PK)',
        },
      }),
      DynamoUnitOfWork.operation({
        Put: {
          TableName,
          Item: LessonContentItem.fromEntity(lesson).toItem(),
          ConditionExpression: 'attribute_not_exists(PK)',
        },
      }),
    ];
  }

  updateOperations(
    lesson: Lesson,
    { bodyChanged }: { bodyChanged: boolean },
  ): UnitOfWork.Operation[] {
    const TableName = this.config.mainTableName;
    const operations = [
      DynamoUnitOfWork.operation(
        {
          Update: {
            TableName,
            Key: this.summaryKeyOf(lesson, lesson.moduleId),
            UpdateExpression:
              'SET title = :title, durationMinutes = :durationMinutes',
            ConditionExpression: 'attribute_exists(PK)',
            ExpressionAttributeValues: {
              ':title': lesson.title,
              ':durationMinutes': lesson.durationMinutes,
            },
          },
        },
        () => new LessonNotFound(),
      ),
    ];

    if (bodyChanged) {
      operations.push(
        DynamoUnitOfWork.operation({
          Update: {
            TableName,
            Key: this.contentKeyOf(lesson),
            UpdateExpression: 'SET body = :body',
            ExpressionAttributeValues: { ':body': lesson.body },
          },
        }),
      );
    }

    return operations;
  }

  deleteOperations(lesson: Lesson): UnitOfWork.Operation[] {
    const TableName = this.config.mainTableName;

    return [
      DynamoUnitOfWork.operation(
        {
          Delete: {
            TableName,
            Key: this.summaryKeyOf(lesson, lesson.moduleId),
            ConditionExpression: 'attribute_exists(PK)',
          },
        },
        () => new LessonNotFound(),
      ),
      DynamoUnitOfWork.operation({
        Delete: { TableName, Key: this.contentKeyOf(lesson) },
      }),
    ];
  }

  repositionOperation(lesson: Lesson): UnitOfWork.Operation {
    return DynamoUnitOfWork.operation({
      Update: {
        TableName: this.config.mainTableName,
        Key: this.summaryKeyOf(lesson, lesson.moduleId),
        UpdateExpression: 'SET #position = :position',
        ConditionExpression: 'attribute_exists(PK)',
        ExpressionAttributeNames: { '#position': 'position' },
        ExpressionAttributeValues: { ':position': lesson.position },
      },
    });
  }

  moveOperations(
    lesson: Lesson,
    fromModuleId: Module.Id,
  ): UnitOfWork.Operation[] {
    const TableName = this.config.mainTableName;

    return [
      DynamoUnitOfWork.operation({
        // Held to what the outline read, so a rename in between is not lost (Q289).
        Delete: {
          TableName,
          Key: this.summaryKeyOf(lesson, fromModuleId),
          ConditionExpression:
            'attribute_exists(PK) AND title = :title AND durationMinutes = :durationMinutes',
          ExpressionAttributeValues: {
            ':title': lesson.title,
            ':durationMinutes': lesson.durationMinutes,
          },
        },
      }),
      DynamoUnitOfWork.operation({
        Put: { TableName, Item: LessonItem.fromEntity(lesson).toItem() },
      }),
    ];
  }

  private summaryKeyOf(lesson: Lesson, moduleId: Module.Id) {
    return {
      PK: LessonItem.getPK(lesson.courseId),
      SK: LessonItem.getSK(moduleId, lesson.id),
    };
  }

  private contentKeyOf(lesson: Lesson) {
    return {
      PK: LessonContentItem.getPK(lesson.id),
      SK: LessonContentItem.getSK(),
    };
  }
}
