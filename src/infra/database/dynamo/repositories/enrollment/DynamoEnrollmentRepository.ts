import { GetCommand } from '@aws-sdk/lib-dynamodb';

import type { UnitOfWork } from '@application/contracts/UnitOfWork';
import type { Account } from '@application/entities/account/Account';
import type { Course } from '@application/entities/course/Course';
import {
  type Enrollment,
  enrollmentStatuses,
} from '@application/entities/enrollment/Enrollment';
import type { EnrollmentRepository } from '@application/repositories/enrollment/EnrollmentRepository';
import { dynamoClient } from '@infra/clients/dynamoClient';
import { copyName } from '@infra/database/dynamo/copyName';
import { DynamoUnitOfWork } from '@infra/database/dynamo/DynamoUnitOfWork';
import { EnrollmentItem } from '@infra/database/dynamo/items/enrollment/EnrollmentItem';
import { queryAll } from '@infra/database/dynamo/queryAll';
import type { AppConfig } from '@shared/config/AppConfig';

export class DynamoEnrollmentRepository implements EnrollmentRepository {
  constructor(private readonly config: AppConfig) {}

  async find(
    accountId: Account.Id,
    courseId: Course.Id,
  ): Promise<Enrollment | null> {
    const command = new GetCommand({
      TableName: this.config.mainTableName,
      Key: {
        PK: EnrollmentItem.getPK(accountId),
        SK: EnrollmentItem.getSK(courseId),
      },
      ConsistentRead: true,
    });

    const { Item } = await dynamoClient.send(command);

    return Item
      ? EnrollmentItem.toEntity(Item as EnrollmentItem.ItemType)
      : null;
  }

  createOperation(enrollment: Enrollment): UnitOfWork.Operation {
    return DynamoUnitOfWork.operation({
      Put: {
        TableName: this.config.mainTableName,
        Item: EnrollmentItem.fromEntity(enrollment).toItem(),
        ConditionExpression: 'attribute_not_exists(PK)',
      },
    });
  }

  reactivateOperation(enrollment: Enrollment): UnitOfWork.Operation {
    return DynamoUnitOfWork.operation({
      Update: {
        TableName: this.config.mainTableName,
        Key: this.keyOf(enrollment),
        UpdateExpression:
          'SET #status = :active, GSI1PK = :gsi1pk, GSI1SK = :gsi1sk, GSI2PK = :gsi2pk, GSI2SK = :gsi2sk',
        ConditionExpression: '#status = :cancelled',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':active': enrollmentStatuses.Active,
          ':cancelled': enrollmentStatuses.Cancelled,
          ':gsi1pk': EnrollmentItem.getGSI1PK(enrollment.courseId),
          ':gsi1sk': EnrollmentItem.getGSI1SK(
            enrollment.enrolledAt.toISOString(),
            enrollment.accountId,
          ),
          ':gsi2pk': EnrollmentItem.getGSI2PK(enrollment.accountId),
          ':gsi2sk': EnrollmentItem.getGSI2SK(
            enrollment.enrolledAt.toISOString(),
            enrollment.courseId,
          ),
        },
      },
    });
  }

  cancelOperation(enrollment: Enrollment): UnitOfWork.Operation {
    return DynamoUnitOfWork.operation({
      Update: {
        TableName: this.config.mainTableName,
        Key: this.keyOf(enrollment),
        UpdateExpression:
          'SET #status = :cancelled REMOVE GSI1PK, GSI1SK, GSI2PK, GSI2SK',
        ConditionExpression: '#status = :active',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':active': enrollmentStatuses.Active,
          ':cancelled': enrollmentStatuses.Cancelled,
        },
      },
    });
  }

  activeOperation(enrollment: Enrollment): UnitOfWork.Operation {
    return DynamoUnitOfWork.operation({
      ConditionCheck: {
        TableName: this.config.mainTableName,
        Key: this.keyOf(enrollment),
        ConditionExpression: '#status = :active',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':active': enrollmentStatuses.Active },
      },
    });
  }

  addCompletedLessonsOperation(
    enrollment: Enrollment,
    delta: number,
  ): UnitOfWork.Operation {
    return DynamoUnitOfWork.operation({
      Update: {
        TableName: this.config.mainTableName,
        Key: this.keyOf(enrollment),
        UpdateExpression: 'ADD completedLessons :delta',
        ConditionExpression: '#status = :active',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':delta': delta,
          ':active': enrollmentStatuses.Active,
        },
      },
    });
  }

  // Copies the name into every enrollment of the student (Q81, Q290).
  async updateStudentName(accountId: Account.Id, name: string): Promise<void> {
    await copyName({
      tableName: this.config.mainTableName,
      keys: await this.enrollmentKeysOf(accountId),
      attribute: 'studentName',
      name,
    });
  }

  private keyOf(enrollment: Enrollment) {
    return {
      PK: EnrollmentItem.getPK(enrollment.accountId),
      SK: EnrollmentItem.getSK(enrollment.courseId),
    };
  }

  private async enrollmentKeysOf(
    accountId: Account.Id,
  ): Promise<Record<string, unknown>[]> {
    const keys = (await queryAll({
      TableName: this.config.mainTableName,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      ExpressionAttributeValues: {
        ':pk': EnrollmentItem.getPK(accountId),
        ':prefix': 'ENROLLMENT#',
      },
      ProjectionExpression: 'PK, SK',
      ConsistentRead: true,
    })) as Record<string, unknown>[];

    return keys;
  }
}
