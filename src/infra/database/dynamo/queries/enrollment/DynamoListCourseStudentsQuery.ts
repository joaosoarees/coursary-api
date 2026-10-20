import { z } from 'zod';

import type { Page } from '@application/contracts/Page';
import type { ListCourseStudentsQuery } from '@application/queries/enrollment/ListCourseStudentsQuery';
import { StudentSummary } from '@application/queries/enrollment/StudentSummary';
import { DynamoPagination } from '@infra/database/dynamo/DynamoPagination';
import { EnrollmentItem } from '@infra/database/dynamo/items/enrollment/EnrollmentItem';
import type { AppConfig } from '@shared/config/AppConfig';

export class DynamoListCourseStudentsQuery implements ListCourseStudentsQuery {
  constructor(private readonly config: AppConfig) {}

  async execute({
    courseId,
    page,
  }: ListCourseStudentsQuery.Input): Promise<Page<StudentSummary>> {
    const GSI1PK = EnrollmentItem.getGSI1PK(courseId);
    const pagination = new DynamoPagination(
      z.strictObject({
        GSI1PK: z.literal(GSI1PK),
        GSI1SK: z.string().startsWith('ENROLLMENT#'),
        PK: z.string().startsWith('ACCOUNT#'),
        SK: z.literal(EnrollmentItem.getSK(courseId)),
      }),
    );

    const { items, nextCursor } =
      await pagination.queryPage<EnrollmentItem.ItemType>(
        {
          TableName: this.config.mainTableName,
          IndexName: 'GSI1',
          KeyConditionExpression:
            'GSI1PK = :pk AND begins_with(GSI1SK, :prefix)',
          ExpressionAttributeValues: {
            ':pk': GSI1PK,
            ':prefix': 'ENROLLMENT#',
          },
          ScanIndexForward: false,
        },
        page,
      );

    return {
      items: items.map((item) =>
        StudentSummary.fromEnrollment(EnrollmentItem.toEntity(item)),
      ),
      nextCursor,
    };
  }
}
