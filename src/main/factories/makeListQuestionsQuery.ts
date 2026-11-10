import type { ListQuestionsQuery } from '@application/queries/question/ListQuestionsQuery';
import { DynamoListQuestionsQuery } from '@infra/database/dynamo/queries/question/DynamoListQuestionsQuery';
import { makeAppConfig } from '@main/factories/makeAppConfig';

export function makeListQuestionsQuery(): ListQuestionsQuery {
  const appConfig = makeAppConfig();

  return new DynamoListQuestionsQuery(appConfig);
}
