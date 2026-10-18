import { dynamoStreamRouter } from '@main/adapters/dynamoStreamRouter';
import { makeCatalogIndexQueue } from '@main/factories/makeCatalogIndexQueue';
import { makeCognitoCleanupQueue } from '@main/factories/makeCognitoCleanupQueue';

const catalogIndexQueue = makeCatalogIndexQueue();
const cognitoCleanupQueue = makeCognitoCleanupQueue();

export const handler = dynamoStreamRouter(
  catalogIndexQueue,
  cognitoCleanupQueue,
);
