import type { Course } from '@application/entities/course/Course';

export interface CatalogIndexQueue {
  enqueue: (requests: CatalogIndexQueue.Request[]) => Promise<void>;
}

export namespace CatalogIndexQueue {
  export interface Request {
    courseId: Course.Id;
    // Unique per change: the same id twice within five minutes is dropped.
    deduplicationId: string;
  }
}
