import type { SentMailRepository } from '@application/repositories/mail/SentMailRepository';
import { DynamoSentMailRepository } from '@infra/database/dynamo/repositories/mail/DynamoSentMailRepository';
import { makeAppConfig } from '@main/factories/makeAppConfig';

export function makeSentMailRepository(): SentMailRepository {
  const appConfig = makeAppConfig();

  return new DynamoSentMailRepository(appConfig);
}
