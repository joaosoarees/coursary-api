import { dynamoStreamRouter } from '@main/adapters/dynamoStreamRouter';
import { makeCatalogIndexQueue } from '@main/factories/makeCatalogIndexQueue';
import { makeCognitoCleanupQueue } from '@main/factories/makeCognitoCleanupQueue';
import { makeCourseDeletionQueue } from '@main/factories/makeCourseDeletionQueue';
import { makeMailQueue } from '@main/factories/makeMailQueue';

const catalogIndexQueue = makeCatalogIndexQueue();
const cognitoCleanupQueue = makeCognitoCleanupQueue();
const mailQueue = makeMailQueue();
const courseDeletionQueue = makeCourseDeletionQueue();

export const handler = dynamoStreamRouter(
  catalogIndexQueue,
  cognitoCleanupQueue,
  mailQueue,
  courseDeletionQueue,
);
