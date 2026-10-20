import { GetCommand } from '@aws-sdk/lib-dynamodb';

import type { UnitOfWork } from '@application/contracts/UnitOfWork';
import type { Account } from '@application/entities/account/Account';
import type { Course } from '@application/entities/course/Course';
import type { Review } from '@application/entities/review/Review';
import type { ReviewRepository } from '@application/repositories/review/ReviewRepository';
import { dynamoClient } from '@infra/clients/dynamoClient';
import { copyName } from '@infra/database/dynamo/copyName';
import { DynamoUnitOfWork } from '@infra/database/dynamo/DynamoUnitOfWork';
import { ReviewItem } from '@infra/database/dynamo/items/review/ReviewItem';
import { queryAll } from '@infra/database/dynamo/queryAll';
import type { AppConfig } from '@shared/config/AppConfig';

export class DynamoReviewRepository implements ReviewRepository {
  constructor(private readonly config: AppConfig) {}

  // Strong: the edit decides the counter difference on it, and the edit screen
  // reads right after a write (Q282, Q284).
  async find(
    accountId: Account.Id,
    courseId: Course.Id,
  ): Promise<Review | null> {
    const command = new GetCommand({
      TableName: this.config.mainTableName,
      Key: this.keyOf(accountId, courseId),
      ConsistentRead: true,
    });

    const { Item } = await dynamoClient.send(command);

    return Item ? ReviewItem.toEntity(Item as ReviewItem.ItemType) : null;
  }

  createOperation(review: Review): UnitOfWork.Operation {
    return DynamoUnitOfWork.operation({
      Put: {
        TableName: this.config.mainTableName,
        Item: ReviewItem.fromEntity(review).toItem(),
        ConditionExpression: 'attribute_not_exists(PK)',
      },
    });
  }

  updateOperation(
    review: Review,
    previousRating: number,
  ): UnitOfWork.Operation {
    return DynamoUnitOfWork.operation({
      Update: {
        TableName: this.config.mainTableName,
        Key: this.keyOf(review.accountId, review.courseId),
        UpdateExpression:
          'SET rating = :rating, #comment = :comment, updatedAt = :updatedAt',
        ConditionExpression: 'rating = :previous',
        ExpressionAttributeNames: { '#comment': 'comment' },
        ExpressionAttributeValues: {
          ':rating': review.rating,
          ':comment': review.comment,
          ':updatedAt': review.updatedAt.toISOString(),
          ':previous': previousRating,
        },
      },
    });
  }

  // Copies the name into every review of the student (Q81, Q290).
  async updateStudentName(accountId: Account.Id, name: string): Promise<void> {
    const keys = (await queryAll({
      TableName: this.config.mainTableName,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      ExpressionAttributeValues: {
        ':pk': ReviewItem.getPK(accountId),
        ':prefix': 'REVIEW#',
      },
      ProjectionExpression: 'PK, SK',
      ConsistentRead: true,
    })) as Record<string, unknown>[];

    await copyName({
      tableName: this.config.mainTableName,
      keys,
      attribute: 'studentName',
      name,
    });
  }

  private keyOf(accountId: Account.Id, courseId: Course.Id) {
    return { PK: ReviewItem.getPK(accountId), SK: ReviewItem.getSK(courseId) };
  }
}
