import type { CognitoCleanupQueue } from '@application/gateways/auth/CognitoCleanupQueue';
import { SqsCognitoCleanupQueue } from '@infra/gateways/auth/SqsCognitoCleanupQueue';
import { makeAppConfig } from '@main/factories/makeAppConfig';

export function makeCognitoCleanupQueue(): CognitoCleanupQueue {
  const appConfig = makeAppConfig();

  return new SqsCognitoCleanupQueue(appConfig);
}
