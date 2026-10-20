import { z } from 'zod';

import type { Page } from '@application/contracts/Page';
import { EnrollmentSummary } from '@application/queries/enrollment/EnrollmentSummary';
import type { ListMyEnrollmentsQuery } from '@application/queries/enrollment/ListMyEnrollmentsQuery';
import type { CourseRepository } from '@application/repositories/course/CourseRepository';
import { DynamoPagination } from '@infra/database/dynamo/DynamoPagination';
import { EnrollmentItem } from '@infra/database/dynamo/items/enrollment/EnrollmentItem';
import type { AppConfig } from '@shared/config/AppConfig';

// The student's active enrollments from GSI2 (Q268), each with its course read
// by BatchGet (Q80, Q269): title, instructor and lesson count stay references.
export class DynamoListMyEnrollmentsQuery implements ListMyEnrollmentsQuery {
  constructor(
    private readonly config: AppConfig,
    private readonly courses: CourseRepository,
  ) {}

  async execute({
    accountId,
    page,
  }: ListMyEnrollmentsQuery.Input): Promise<Page<EnrollmentSummary>> {
    const GSI2PK = EnrollmentItem.getGSI2PK(accountId);
    const pagination = new DynamoPagination(
      z.strictObject({
        GSI2PK: z.literal(GSI2PK),
        GSI2SK: z.string().min(1),
        PK: z.literal(EnrollmentItem.getPK(accountId)),
        SK: z.string().startsWith('ENROLLMENT#'),
      }),
    );

    const { items, nextCursor } =
      await pagination.queryPage<EnrollmentItem.ItemType>(
        {
          TableName: this.config.mainTableName,
          IndexName: 'GSI2',
          KeyConditionExpression: 'GSI2PK = :pk',
          ExpressionAttributeValues: { ':pk': GSI2PK },
          ScanIndexForward: false,
        },
        page,
      );
    const courses = await this.courses.findManyByIds(
      items.map((item) => item.courseId),
    );

    return {
      items: items.flatMap((item) => {
        const course = courses.get(item.courseId);

        if (!course) {
          console.warn(
            JSON.stringify({
              event: 'EnrollmentWithoutCourse',
              accountId,
              courseId: item.courseId,
            }),
          );
          return [];
        }

        return [
          EnrollmentSummary.fromEnrollment(
            EnrollmentItem.toEntity(item),
            course,
          ),
        ];
      }),
      nextCursor,
    };
  }
}
