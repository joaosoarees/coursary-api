import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import {
  BatchGetCommand,
  GetCommand,
  PutCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';

import type { UnitOfWork } from '@application/contracts/UnitOfWork';
import type { Account } from '@application/entities/account/Account';
import {
  type Course,
  courseStatuses,
} from '@application/entities/course/Course';
import { StudentExport } from '@application/entities/export/StudentExport';
import type { File } from '@application/entities/file/File';
import { Conflict } from '@application/errors/common';
import {
  CourseArchived,
  CourseEmpty,
  CourseNotDraft,
  CourseNotFound,
  CourseNotPublished,
} from '@application/errors/course';
import { ExportPending } from '@application/errors/export';
import type { CourseRepository } from '@application/repositories/course/CourseRepository';
import { dynamoClient } from '@infra/clients/dynamoClient';
import { copyName } from '@infra/database/dynamo/copyName';
import { DynamoUnitOfWork } from '@infra/database/dynamo/DynamoUnitOfWork';
import { CourseDescriptionItem } from '@infra/database/dynamo/items/course/CourseDescriptionItem';
import { CourseItem } from '@infra/database/dynamo/items/course/CourseItem';
import { queryAll } from '@infra/database/dynamo/queryAll';
import type { AppConfig } from '@shared/config/AppConfig';

export class DynamoCourseRepository implements CourseRepository {
  static readonly maxBatchRounds = 3;

  static readonly maxBatchKeys = 100;

  constructor(private readonly config: AppConfig) {}

  async create(course: Course, description = ''): Promise<void> {
    const put = {
      TableName: this.config.mainTableName,
      Item: CourseItem.fromEntity(course).toItem(),
      ConditionExpression: 'attribute_not_exists(PK)',
    };

    if (description) {
      const unit = new DynamoUnitOfWork();
      unit.add(
        DynamoUnitOfWork.operation({ Put: put }),
        this.putDescriptionOperation(course.id, description),
      );
      await unit.commit();

      return;
    }

    try {
      await dynamoClient.send(new PutCommand(put));
    } catch (error) {
      // A taken id answers as the transaction does.
      throw error instanceof ConditionalCheckFailedException
        ? new Conflict()
        : error;
    }
  }

  async findById(
    id: Course.Id,
    { consistent = false }: CourseRepository.ReadOptions = {},
  ): Promise<Course | null> {
    const command = new GetCommand({
      TableName: this.config.mainTableName,
      Key: { PK: CourseItem.getPK(id), SK: CourseItem.getSK(id) },
      ConsistentRead: consistent,
    });

    const { Item } = await dynamoClient.send(command);

    return Item ? CourseItem.toLiveEntity(Item as CourseItem.ItemType) : null;
  }

  async findDescription(
    id: Course.Id,
    { consistent = false }: CourseRepository.ReadOptions = {},
  ): Promise<string> {
    const command = new GetCommand({
      TableName: this.config.mainTableName,
      Key: {
        PK: CourseDescriptionItem.getPK(id),
        SK: CourseDescriptionItem.getSK(),
      },
      ConsistentRead: consistent,
    });

    const { Item } = await dynamoClient.send(command);

    return CourseDescriptionItem.toDescription(
      Item as CourseDescriptionItem.ItemType | undefined,
    );
  }

  async findManyByIds(ids: Course.Id[]): Promise<Map<Course.Id, Course>> {
    if (ids.length > DynamoCourseRepository.maxBatchKeys) {
      throw new Error(
        `BatchGet reads at most ${String(DynamoCourseRepository.maxBatchKeys)} courses.`,
      );
    }

    const TableName = this.config.mainTableName;
    const courses = new Map<Course.Id, Course>();
    let keys: Record<string, unknown>[] = [...new Set(ids)].map((id) => ({
      PK: CourseItem.getPK(id),
      SK: CourseItem.getSK(id),
    }));

    for (
      let round = 0;
      keys.length > 0 && round < DynamoCourseRepository.maxBatchRounds;
      round++
    ) {
      if (round > 0) {
        await new Promise((resolve) => setTimeout(resolve, 50 * 2 ** round));
      }

      const command = new BatchGetCommand({
        RequestItems: { [TableName]: { Keys: keys } },
      });
      const { Responses, UnprocessedKeys } = await dynamoClient.send(command);

      for (const item of (Responses?.[TableName] ??
        []) as CourseItem.ItemType[]) {
        const course = CourseItem.toLiveEntity(item);

        if (course) {
          courses.set(item.id, course);
        }
      }

      keys = UnprocessedKeys?.[TableName]?.Keys ?? [];
    }

    if (keys.length > 0) {
      throw new Error(`BatchGet left ${String(keys.length)} courses unread.`);
    }

    return courses;
  }

  // Both writes hold to a course that exists and is not archived.
  async update(course: Course, changes: Course.Changes): Promise<void> {
    const edit = {
      TableName: this.config.mainTableName,
      Key: this.keyOf(course),
      // A course being deleted takes no edit: its job may already have emptied it.
      ConditionExpression:
        'attribute_exists(PK) AND #status <> :archived AND #status <> :deleting',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':archived': courseStatuses.Archived,
        ':deleting': CourseItem.deletingStatus,
      },
      ReturnValuesOnConditionCheckFailure: 'ALL_OLD' as const,
    };
    const titleUpdate = {
      ...edit,
      UpdateExpression: 'SET title = :title',
      ExpressionAttributeValues: {
        ...edit.ExpressionAttributeValues,
        ':title': changes.title,
      },
    };

    if (changes.description === undefined) {
      try {
        await dynamoClient.send(new UpdateCommand(titleUpdate));
      } catch (error) {
        throw error instanceof ConditionalCheckFailedException
          ? DynamoCourseRepository.editRefusal(error.Item)
          : error;
      }

      return;
    }

    const unit = new DynamoUnitOfWork();
    unit.add(
      DynamoUnitOfWork.operation(
        changes.title === undefined
          ? { ConditionCheck: edit }
          : { Update: titleUpdate },
        (stored) => DynamoCourseRepository.editRefusal(stored),
      ),
      changes.description
        ? this.putDescriptionOperation(course.id, changes.description)
        : DynamoUnitOfWork.operation({
            Delete: {
              TableName: this.config.mainTableName,
              Key: {
                PK: CourseDescriptionItem.getPK(course.id),
                SK: CourseDescriptionItem.getSK(),
              },
            },
          }),
    );
    await unit.commit();
  }

  async publish(id: Course.Id, publishedAt: Date): Promise<Course> {
    const at = publishedAt.toISOString();
    const command = new UpdateCommand({
      TableName: this.config.mainTableName,
      Key: { PK: CourseItem.getPK(id), SK: CourseItem.getSK(id) },
      UpdateExpression:
        'SET #status = :published, publishedAt = :at, GSI2PK = :gsi2pk, GSI2SK = :gsi2sk',
      ConditionExpression: '#status = :draft AND lessonCount > :none',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':published': courseStatuses.Published,
        ':draft': courseStatuses.Draft,
        ':none': 0,
        ':at': at,
        ':gsi2pk': CourseItem.getGSI2PK(),
        ':gsi2sk': CourseItem.getGSI2SK(at, id),
      },
      ReturnValues: 'ALL_NEW',
      ReturnValuesOnConditionCheckFailure: 'ALL_OLD',
    });

    try {
      const { Attributes } = await dynamoClient.send(command);

      return CourseItem.toEntity(Attributes as CourseItem.ItemType);
    } catch (error) {
      if (error instanceof ConditionalCheckFailedException) {
        throw DynamoCourseRepository.refusal(error, new CourseEmpty());
      }

      throw error;
    }
  }

  async archive(id: Course.Id): Promise<Course> {
    const command = new UpdateCommand({
      TableName: this.config.mainTableName,
      Key: { PK: CourseItem.getPK(id), SK: CourseItem.getSK(id) },
      UpdateExpression: 'SET #status = :archived REMOVE GSI2PK, GSI2SK',
      ConditionExpression: '#status = :published',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':archived': courseStatuses.Archived,
        ':published': courseStatuses.Published,
      },
      ReturnValues: 'ALL_NEW',
      ReturnValuesOnConditionCheckFailure: 'ALL_OLD',
    });

    try {
      const { Attributes } = await dynamoClient.send(command);

      return CourseItem.toEntity(Attributes as CourseItem.ItemType);
    } catch (error) {
      if (error instanceof ConditionalCheckFailedException) {
        throw DynamoCourseRepository.refusal(error, new CourseNotPublished());
      }

      throw error;
    }
  }

  async markDeleting(id: Course.Id): Promise<void> {
    const command = new UpdateCommand({
      TableName: this.config.mainTableName,
      Key: { PK: CourseItem.getPK(id), SK: CourseItem.getSK(id) },
      UpdateExpression: 'SET #status = :deleting REMOVE GSI1PK, GSI1SK',
      ConditionExpression: '#status = :draft',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':deleting': CourseItem.deletingStatus,
        ':draft': courseStatuses.Draft,
      },
      ReturnValuesOnConditionCheckFailure: 'ALL_OLD',
    });

    try {
      await dynamoClient.send(command);
    } catch (error) {
      if (error instanceof ConditionalCheckFailedException) {
        const status = error.Item?.status?.S;
        throw !status || status === CourseItem.deletingStatus
          ? new CourseNotFound()
          : new CourseNotDraft();
      }

      throw error;
    }
  }

  async updateInstructorName(
    instructorId: Account.Id,
    name: string,
  ): Promise<void> {
    await copyName({
      tableName: this.config.mainTableName,
      keys: await this.courseKeysOf(instructorId),
      attribute: 'instructorName',
      name,
    });
  }

  statusUnchangedOperation(course: Course): UnitOfWork.Operation {
    return DynamoUnitOfWork.operation({
      ConditionCheck: {
        TableName: this.config.mainTableName,
        Key: this.keyOf(course),
        ConditionExpression: '#status = :status',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':status': course.status },
      },
    });
  }

  addLessonsOperation(course: Course, delta: number): UnitOfWork.Operation {
    return DynamoUnitOfWork.operation({
      Update: {
        TableName: this.config.mainTableName,
        Key: this.keyOf(course),
        UpdateExpression: 'ADD lessonCount :delta',
        ConditionExpression: '#status = :status',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':delta': delta,
          ':status': course.status,
        },
      },
    });
  }

  addEnrollmentsOperation(
    course: Course,
    delta: number,
    { requirePublished }: CourseRepository.EnrollmentCountOptions,
  ): UnitOfWork.Operation {
    return DynamoUnitOfWork.operation({
      Update: {
        TableName: this.config.mainTableName,
        Key: this.keyOf(course),
        UpdateExpression: 'ADD enrollmentCount :delta',
        ConditionExpression: requirePublished
          ? '#status = :published'
          : 'attribute_exists(PK)',
        ...(requirePublished
          ? {
              ExpressionAttributeNames: { '#status': 'status' },
              ExpressionAttributeValues: {
                ':delta': delta,
                ':published': courseStatuses.Published,
              },
            }
          : { ExpressionAttributeValues: { ':delta': delta } }),
      },
    });
  }

  addRatingsOperation(
    course: Course,
    { sumDelta, countDelta }: CourseRepository.RatingDeltas,
  ): UnitOfWork.Operation {
    return DynamoUnitOfWork.operation({
      Update: {
        TableName: this.config.mainTableName,
        Key: this.keyOf(course),
        UpdateExpression: 'ADD ratingSum :sum, ratingCount :count',
        ConditionExpression: 'attribute_exists(PK)',
        ExpressionAttributeValues: { ':sum': sumDelta, ':count': countDelta },
      },
    });
  }

  // Only over the cover the caller read, and never on a course being deleted.
  setCoverOperation(
    courseId: Course.Id,
    cover: File.Copy,
    previousFileId: File.Id | undefined,
  ): UnitOfWork.Operation {
    return DynamoUnitOfWork.operation({
      Update: {
        TableName: this.config.mainTableName,
        Key: { PK: CourseItem.getPK(courseId), SK: CourseItem.getSK(courseId) },
        UpdateExpression: 'SET cover = :cover',
        ConditionExpression: `attribute_exists(PK) AND #status <> :deleting AND ${
          previousFileId
            ? 'cover.fileId = :previous'
            : 'attribute_not_exists(cover)'
        }`,
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':cover': cover,
          ':deleting': CourseItem.deletingStatus,
          ...(previousFileId ? { ':previous': previousFileId } : {}),
        },
      },
    });
  }

  // One export at a time per course, unless the pending one is past its time.
  startExportOperation(studentExport: StudentExport): UnitOfWork.Operation {
    const { courseId } = studentExport;
    const since = StudentExport.pendingSince(studentExport.createdAt);

    return DynamoUnitOfWork.operation(
      {
        Update: {
          TableName: this.config.mainTableName,
          Key: {
            PK: CourseItem.getPK(courseId),
            SK: CourseItem.getSK(courseId),
          },
          UpdateExpression:
            'SET pendingExportId = :exportId, pendingExportAt = :at',
          ConditionExpression:
            'attribute_exists(PK) AND #status <> :deleting AND (attribute_not_exists(pendingExportId) OR pendingExportAt < :since)',
          ExpressionAttributeNames: { '#status': 'status' },
          ExpressionAttributeValues: {
            ':exportId': studentExport.id,
            ':at': studentExport.createdAt.toISOString(),
            ':deleting': CourseItem.deletingStatus,
            ':since': since.toISOString(),
          },
        },
      },
      () => new ExportPending(),
    );
  }

  // Only the export that is still the course's pending one; a newer one stays.
  async clearPendingExport(studentExport: StudentExport): Promise<void> {
    const { courseId } = studentExport;
    const command = new UpdateCommand({
      TableName: this.config.mainTableName,
      Key: { PK: CourseItem.getPK(courseId), SK: CourseItem.getSK(courseId) },
      UpdateExpression: 'REMOVE pendingExportId, pendingExportAt',
      ConditionExpression: 'pendingExportId = :exportId',
      ExpressionAttributeValues: { ':exportId': studentExport.id },
    });

    try {
      await dynamoClient.send(command);
    } catch (error) {
      if (!(error instanceof ConditionalCheckFailedException)) {
        throw error;
      }
    }
  }

  private putDescriptionOperation(
    courseId: Course.Id,
    description: string,
  ): UnitOfWork.Operation {
    return DynamoUnitOfWork.operation({
      Put: {
        TableName: this.config.mainTableName,
        Item: new CourseDescriptionItem({ courseId, description }).toItem(),
      },
    });
  }

  private keyOf(course: Course) {
    return { PK: CourseItem.getPK(course.id), SK: CourseItem.getSK(course.id) };
  }

  private async courseKeysOf(
    instructorId: Account.Id,
  ): Promise<Record<string, unknown>[]> {
    const keys = (await queryAll({
      TableName: this.config.mainTableName,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: {
        ':pk': CourseItem.getGSI1PK(instructorId),
      },
      ProjectionExpression: 'PK, SK',
    })) as Record<string, unknown>[];

    return keys;
  }

  // Archived is a refusal; gone or being deleted is not found, as everywhere else.
  private static editRefusal(stored: unknown): Error {
    const status = (stored as { status?: { S?: string } } | undefined)?.status
      ?.S;

    return status === courseStatuses.Archived
      ? new CourseArchived()
      : new CourseNotFound();
  }

  // The item as it was when the condition failed tells why.
  private static refusal(
    error: ConditionalCheckFailedException,
    whenDraft: Error,
  ): Error {
    if (!error.Item) {
      return new CourseNotFound();
    }

    switch (error.Item.status?.S) {
      case courseStatuses.Archived:
        return new CourseArchived();
      case courseStatuses.Draft:
        return whenDraft;
      default:
        return new Conflict();
    }
  }
}
