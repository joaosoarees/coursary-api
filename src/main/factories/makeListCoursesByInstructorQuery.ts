import type { ListCoursesByInstructorQuery } from '@application/queries/course/ListCoursesByInstructorQuery';
import { DynamoListCoursesByInstructorQuery } from '@infra/database/dynamo/queries/course/DynamoListCoursesByInstructorQuery';
import { makeAppConfig } from '@main/factories/makeAppConfig';

export function makeListCoursesByInstructorQuery(): ListCoursesByInstructorQuery {
  const appConfig = makeAppConfig();

  return new DynamoListCoursesByInstructorQuery(appConfig);
}
