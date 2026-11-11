import { dynamoStreamRouter } from '@main/adapters/dynamoStreamRouter';
import { makeCatalogIndexQueue } from '@main/factories/makeCatalogIndexQueue';
import { makeCognitoCleanupQueue } from '@main/factories/makeCognitoCleanupQueue';
import { makeCourseDeletionQueue } from '@main/factories/makeCourseDeletionQueue';
import { makeMailQueue } from '@main/factories/makeMailQueue';
import { makeRealtimeQueue } from '@main/factories/makeRealtimeQueue';
import { makeStudentExportQueue } from '@main/factories/makeStudentExportQueue';

const catalogIndexQueue = makeCatalogIndexQueue();
const cognitoCleanupQueue = makeCognitoCleanupQueue();
const mailQueue = makeMailQueue();
const courseDeletionQueue = makeCourseDeletionQueue();
const studentExportQueue = makeStudentExportQueue();
const realtimeQueue = makeRealtimeQueue();

export const handler = dynamoStreamRouter(
  catalogIndexQueue,
  cognitoCleanupQueue,
  mailQueue,
  courseDeletionQueue,
  studentExportQueue,
  realtimeQueue,
);
