import type { FileRepository } from '@application/repositories/file/FileRepository';
import { DynamoFileRepository } from '@infra/database/dynamo/repositories/file/DynamoFileRepository';
import { makeAppConfig } from '@main/factories/makeAppConfig';

export function makeFileRepository(): FileRepository {
  const appConfig = makeAppConfig();

  return new DynamoFileRepository(appConfig);
}
