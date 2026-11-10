import type { ListAnswersQuery } from '@application/queries/question/ListAnswersQuery';
import { DynamoListAnswersQuery } from '@infra/database/dynamo/queries/question/DynamoListAnswersQuery';
import { makeAppConfig } from '@main/factories/makeAppConfig';

export function makeListAnswersQuery(): ListAnswersQuery {
  const appConfig = makeAppConfig();

  return new DynamoListAnswersQuery(appConfig);
}
