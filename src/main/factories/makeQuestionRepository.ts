import type { QuestionRepository } from '@application/repositories/question/QuestionRepository';
import { DynamoQuestionRepository } from '@infra/database/dynamo/repositories/question/DynamoQuestionRepository';
import { makeAppConfig } from '@main/factories/makeAppConfig';

export function makeQuestionRepository(): QuestionRepository {
  const appConfig = makeAppConfig();

  return new DynamoQuestionRepository(appConfig);
}
