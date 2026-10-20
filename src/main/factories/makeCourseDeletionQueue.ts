import type { CourseDeletionQueue } from '@application/gateways/course/CourseDeletionQueue';
import { SqsCourseDeletionQueue } from '@infra/gateways/course/SqsCourseDeletionQueue';
import { makeAppConfig } from '@main/factories/makeAppConfig';

export function makeCourseDeletionQueue(): CourseDeletionQueue {
  const appConfig = makeAppConfig();

  return new SqsCourseDeletionQueue(appConfig);
}
