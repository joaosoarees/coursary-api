import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { DeleteCommand, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

import type { Course } from '@application/entities/course/Course';
import type { Lesson } from '@application/entities/outline/Lesson';
import type { CourseDeletionRepository } from '@application/repositories/course/CourseDeletionRepository';
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

// What one read found, handed back to be deleted as it was read.
class DynamoCourseDeletionPage {
  readonly lessonIds: Lesson.Id[];

  readonly last: boolean;

  constructor(
    readonly courseKey: { PK: string; SK: string },
    readonly content: StoredKey[],
  ) {
    this.lessonIds = content.flatMap((item) =>
      item.type === LessonItem.type && item.id ? [item.id as Lesson.Id] : [],
    );
    this.last = content.length === 0;
  }
}

// Deletes a course marked DELETING one page at a time, the course item last (Q86, Q371).
export class DynamoCourseDeletion implements CourseDeletionRepository {
  static readonly pageSize = 100;

  static readonly inParallel = 4;

  constructor(private readonly config: AppConfig) {}

  async deleteNextPage(
    courseId: Course.Id,
  ): Promise<'more' | 'done' | 'not-deleting'> {
    const page = await this.nextPage(courseId);

    if (typeof page === 'string') {
      return page;
    }

    await this.deletePage(page);

    return page.last ? 'done' : 'more';
  }

  // Reads without deleting, so the lessons' objects can go before their records (Q417).
  async nextPage(
    courseId: Course.Id,
  ): Promise<DynamoCourseDeletionPage | 'done' | 'not-deleting'> {
    const courseKey = {
      PK: CourseItem.getPK(courseId),
      SK: CourseItem.getSK(courseId),
    };
    const getCourse = new GetCommand({
      TableName: this.config.mainTableName,
      Key: courseKey,
      ConsistentRead: true,
    });
    const { Item: course } = await dynamoClient.send(getCourse);

    if (!course) {
      return 'done';
    }

    // Never a live course, whatever message arrives.
    if (course.status !== CourseItem.deletingStatus) {
      return 'not-deleting';
    }

    const query = new QueryCommand({
      TableName: this.config.mainTableName,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: { ':pk': courseKey.PK },
      ExpressionAttributeNames: { '#type': 'type' },
      ProjectionExpression: 'PK, SK, #type, id',
      ConsistentRead: true,
      Limit: DynamoCourseDeletion.pageSize,
    });
    const { Items = [] } = await dynamoClient.send(query);
    const content = (Items as StoredKey[]).filter(
      (item) => item.SK !== courseKey.SK,
    );

    return new DynamoCourseDeletionPage(courseKey, content);
  }

  // The course item only on the last page, while still marked DELETING.
  async deletePage(page: CourseDeletionRepository.Page): Promise<void> {
    if (!(page instanceof DynamoCourseDeletionPage)) {
      throw new Error('Not a page this repository read.');
    }

    if (page.last) {
      await this.deleteCourseItem(page.courseKey);

      return;
    }

    const { content } = page;

    for (let i = 0; i < content.length; i += DynamoCourseDeletion.inParallel) {
      await Promise.all(
        content
          .slice(i, i + DynamoCourseDeletion.inParallel)
          .map((item) => this.deleteItem(item)),
      );
    }
  }

  // A lesson takes its own partition along, body and material (Q72, Q417); the summary goes last,
  // so a repeated page still finds the lesson.
  private async deleteItem(item: StoredKey): Promise<void> {
    if (item.type === LessonItem.type && item.id) {
      const lessonId = item.id as Lesson.Id;
      await this.deletePartition(LessonContentItem.getPK(lessonId));
    }

    await this.deleteIfThere({ PK: item.PK, SK: item.SK });
  }

  private async deletePartition(pk: string): Promise<void> {
    let startKey: Record<string, unknown> | undefined;

    do {
      const query = new QueryCommand({
        TableName: this.config.mainTableName,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: { ':pk': pk },
        ProjectionExpression: 'PK, SK',
        ConsistentRead: true,
        ExclusiveStartKey: startKey,
      });
      const { Items = [], LastEvaluatedKey } = await dynamoClient.send(query);

      await Promise.all(
        (Items as StoredKey[]).map((key) => this.deleteIfThere(key)),
      );
      startKey = LastEvaluatedKey;
    } while (startKey);
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
