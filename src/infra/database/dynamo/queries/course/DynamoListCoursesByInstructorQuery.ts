import { z } from 'zod';

import type { Page } from '@application/contracts/Page';
import { CourseSummary } from '@application/queries/course/CourseSummary';
import type { ListCoursesByInstructorQuery } from '@application/queries/course/ListCoursesByInstructorQuery';
import { DynamoPagination } from '@infra/database/dynamo/DynamoPagination';
import { CourseItem } from '@infra/database/dynamo/items/course/CourseItem';
import type { AppConfig } from '@shared/config/AppConfig';

export class DynamoListCoursesByInstructorQuery implements ListCoursesByInstructorQuery {
  constructor(private readonly config: AppConfig) {}

  async execute({
    instructorId,
    page,
  }: ListCoursesByInstructorQuery.Input): Promise<Page<CourseSummary>> {
    const GSI1PK = CourseItem.getGSI1PK(instructorId);
    const pagination = new DynamoPagination(
      z.strictObject({
        GSI1PK: z.literal(GSI1PK),
        GSI1SK: z.string().startsWith('COURSE#'),
        PK: z.string().startsWith('COURSE#'),
        SK: z.string().startsWith('COURSE#'),
      }),
    );

    const { items, nextCursor } =
      await pagination.queryPage<CourseItem.ItemType>(
        {
          TableName: this.config.mainTableName,
          IndexName: 'GSI1',
          KeyConditionExpression: 'GSI1PK = :pk',
          ExpressionAttributeValues: { ':pk': GSI1PK },
          ScanIndexForward: false,
        },
        page,
      );

    return {
      items: items.map((item) =>
        CourseSummary.fromCourse(CourseItem.toEntity(item)),
      ),
      nextCursor,
    };
  }
}
