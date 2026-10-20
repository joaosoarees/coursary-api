import type { ListCourseStudentsQuery } from '@application/queries/enrollment/ListCourseStudentsQuery';
import { DynamoListCourseStudentsQuery } from '@infra/database/dynamo/queries/enrollment/DynamoListCourseStudentsQuery';
import { makeAppConfig } from '@main/factories/makeAppConfig';

export function makeListCourseStudentsQuery(): ListCourseStudentsQuery {
  const appConfig = makeAppConfig();

  return new DynamoListCourseStudentsQuery(appConfig);
}
