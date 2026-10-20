import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { DeleteCommand, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

import type { Course } from '@application/entities/course/Course';
import type { Lesson } from '@application/entities/outline/Lesson';
import { dynamoClient } from '@infra/clients/dynamoClient';
import { CourseItem } from '@infra/database/dynamo/items/course/CourseItem';
import { LessonContentItem } from '@infra/database/dynamo/items/outline/LessonContentItem';
import { LessonItem } from '@infra/database/dynamo/items/outline/LessonItem';
import type { AppConfig } from '@shared/config/AppConfig';

interface StoredKey {
  PK: string;
  SK: string;
  type?: string;
  id?: string;
}

// Deletes a course marked DELETING one page at a time, the course item last (Q86, Q371).
export class DynamoCourseDeletion {
  static readonly pageSize = 100;

  static readonly inParallel = 4;

  constructor(private readonly config: AppConfig) {}

  async deleteNextPage(
    courseId: Course.Id,
  ): Promise<'more' | 'done' | 'not-deleting'> {
    const courseKey = {
      PK: CourseItem.getPK(courseId),
      SK: CourseItem.getSK(courseId),
    };
    const { Item: course } = await dynamoClient.send(
      new GetCommand({
        TableName: this.config.mainTableName,
        Key: courseKey,
        ConsistentRead: true,
      }),
    );

    if (!course) {
      return 'done';
    }

    // Never a live course, whatever message arrives.
    if (course.status !== CourseItem.deletingStatus) {
      return 'not-deleting';
    }

    const { Items = [] } = await dynamoClient.send(
      new QueryCommand({
        TableName: this.config.mainTableName,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: { ':pk': courseKey.PK },
        ExpressionAttributeNames: { '#type': 'type' },
        ProjectionExpression: 'PK, SK, #type, id',
        ConsistentRead: true,
        Limit: DynamoCourseDeletion.pageSize,
      }),
    );
    const content = (Items as StoredKey[]).filter(
      (item) => item.SK !== courseKey.SK,
    );

    if (content.length === 0) {
      await this.deleteCourseItem(courseKey);

      return 'done';
    }

    for (let i = 0; i < content.length; i += DynamoCourseDeletion.inParallel) {
      await Promise.all(
        content
          .slice(i, i + DynamoCourseDeletion.inParallel)
          .map((item) => this.deleteItem(item)),
      );
    }

    return 'more';
  }

  // A lesson takes its body along; the body lives in its own partition (Q72).
  private async deleteItem(item: StoredKey): Promise<void> {
    if (item.type === LessonItem.type && item.id) {
      const lessonId = item.id as Lesson.Id;
      await this.deleteIfThere({
        PK: LessonContentItem.getPK(lessonId),
        SK: LessonContentItem.getSK(),
      });
    }

    await this.deleteIfThere({ PK: item.PK, SK: item.SK });
  }

  // Gone already counts as deleted, so a repeated page is harmless.
  private async deleteIfThere(key: { PK: string; SK: string }): Promise<void> {
    await this.ignoringGone(
      new DeleteCommand({
        TableName: this.config.mainTableName,
        Key: key,
        ConditionExpression: 'attribute_exists(PK)',
      }),
    );
  }

  // Only while still marked DELETING: the last step of the job.
  private async deleteCourseItem(key: { PK: string; SK: string }) {
    await this.ignoringGone(
      new DeleteCommand({
        TableName: this.config.mainTableName,
        Key: key,
        ConditionExpression: '#status = :deleting',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':deleting': CourseItem.deletingStatus },
      }),
    );
  }

  private async ignoringGone(command: DeleteCommand): Promise<void> {
    try {
      await dynamoClient.send(command);
    } catch (error) {
      if (!(error instanceof ConditionalCheckFailedException)) {
        throw error;
      }
    }
  }
}
