import type { AccountRepository } from '@application/repositories/account/AccountRepository';
import { DynamoAccountRepository } from '@infra/database/dynamo/repositories/account/DynamoAccountRepository';
import { makeAppConfig } from '@main/factories/makeAppConfig';

export function makeAccountRepository(): AccountRepository {
  const appConfig = makeAppConfig();

  return new DynamoAccountRepository(appConfig);
}
