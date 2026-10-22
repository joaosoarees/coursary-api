import type { FileStorage } from '@application/gateways/file/FileStorage';
import { S3FileStorage } from '@infra/gateways/file/S3FileStorage';
import { makeAppConfig } from '@main/factories/makeAppConfig';

export function makeFileStorage(): FileStorage {
  const appConfig = makeAppConfig();

  return new S3FileStorage(appConfig);
}
