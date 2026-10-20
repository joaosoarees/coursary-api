import type { Course } from '@application/entities/course/Course';

// Asks for a course to be indexed again from its current state (Q302, Q316).
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
