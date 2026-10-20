import type { Course } from '@application/entities/course/Course';
import { CourseOutline } from '@application/queries/outline/CourseOutline';
import type { CourseOutlineQuery } from '@application/queries/outline/CourseOutlineQuery';
import { CourseItem } from '@infra/database/dynamo/items/course/CourseItem';
import { LessonItem } from '@infra/database/dynamo/items/outline/LessonItem';
import { ModuleItem } from '@infra/database/dynamo/items/outline/ModuleItem';
import { queryAll } from '@infra/database/dynamo/queryAll';
import type { AppConfig } from '@shared/config/AppConfig';

export class DynamoCourseOutlineQuery implements CourseOutlineQuery {
  constructor(private readonly config: AppConfig) {}

  async execute(
    courseId: Course.Id,
    { consistent = false }: CourseOutlineQuery.ReadOptions = {},
  ): Promise<CourseOutline> {
    const items = await queryAll({
      TableName: this.config.mainTableName,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      ExpressionAttributeValues: {
        ':pk': CourseItem.getPK(courseId),
        ':prefix': 'MODULE#',
      },
      ConsistentRead: consistent,
    });

    return DynamoCourseOutlineQuery.outlineOf(items as { type: string }[]);
  }

  // Turns the module and lesson items of a course partition into its outline.
  static outlineOf(items: { type: string }[]): CourseOutline {
    const modules = items.flatMap((item) =>
      item.type === ModuleItem.type
        ? [ModuleItem.toEntity(item as ModuleItem.ItemType)]
        : [],
    );
    const lessons = items.flatMap((item) =>
      item.type === LessonItem.type
        ? [LessonItem.toSummary(item as LessonItem.ItemType)]
        : [],
    );

    return CourseOutline.from(modules, lessons);
  }
}
