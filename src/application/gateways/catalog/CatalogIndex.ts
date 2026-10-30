import type { Course } from '@application/entities/course/Course';

export interface CatalogIndex {
  save: (record: CatalogIndex.Record) => Promise<void>;

  remove: (courseId: Course.Id) => Promise<void>;
}

export namespace CatalogIndex {
  // Only what is searched; the search route reads the rest from the table.
  export interface Record {
    courseId: Course.Id;
    title: string;
    description: string;
    instructorName: string;
    publishedAt: string;
  }
}
