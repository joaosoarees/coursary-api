import {
  type Course,
  courseStatuses,
} from '@application/entities/course/Course';
import { CoursePage } from '@application/queries/catalog/CoursePage';
import type { CoursePageQuery } from '@application/queries/catalog/CoursePageQuery';
import { CourseDescriptionItem } from '@infra/database/dynamo/items/course/CourseDescriptionItem';
import { CourseItem } from '@infra/database/dynamo/items/course/CourseItem';
import { DynamoCourseOutlineQuery } from '@infra/database/dynamo/queries/outline/DynamoCourseOutlineQuery';
import { queryAll } from '@infra/database/dynamo/queryAll';
import type { AppConfig } from '@shared/config/AppConfig';

// The course and its outline share one partition, so one query reads them (pattern 6).
export class DynamoCoursePageQuery implements CoursePageQuery {
  constructor(private readonly config: AppConfig) {}

  async execute(courseId: Course.Id): Promise<CoursePage | null> {
    const items = (await queryAll({
      TableName: this.config.mainTableName,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: { ':pk': CourseItem.getPK(courseId) },
    })) as { type: string }[];

    const course = items.find(
      (item): item is CourseItem.ItemType => item.type === CourseItem.type,
    );

    if (course?.status !== courseStatuses.Published) {
      return null;
    }

    const description = items.find(
      (item): item is CourseDescriptionItem.ItemType =>
        item.type === CourseDescriptionItem.type,
    );

    return CoursePage.fromCourse(
      CourseItem.toEntity(course),
      CourseDescriptionItem.toDescription(description),
      DynamoCourseOutlineQuery.outlineOf(items),
    );
  }
}
