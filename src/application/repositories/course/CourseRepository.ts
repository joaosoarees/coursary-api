import type { UnitOfWork } from '@application/contracts/UnitOfWork';
import type { Account } from '@application/entities/account/Account';
import type { Course } from '@application/entities/course/Course';
import type { File } from '@application/entities/file/File';

export interface CourseRepository {
  // Without a description, nothing is stored for it (Q307).
  create: (course: Course, description?: string) => Promise<void>;

  findById: (
    id: Course.Id,
    options?: CourseRepository.ReadOptions,
  ) => Promise<Course | null>;

  findDescription: (
    id: Course.Id,
    options?: CourseRepository.ReadOptions,
  ) => Promise<string>;

  // Missing courses are left out of the map; at most 100 ids (Q80, Q330).
  findManyByIds: (ids: Course.Id[]) => Promise<Map<Course.Id, Course>>;

  update: (course: Course, changes: Course.Changes) => Promise<void>;

  publish: (id: Course.Id, publishedAt: Date) => Promise<Course>;

  archive: (id: Course.Id) => Promise<Course>;

  // From then on the course reads as absent; a job deletes what it holds (Q368, Q369).
  markDeleting: (id: Course.Id) => Promise<void>;

  // Fails with Conflict when the cover is no longer the one read, or the course is being deleted.
  setCoverOperation: (
    courseId: Course.Id,
    cover: File.Copy,
    previousFileId: File.Id | undefined,
  ) => UnitOfWork.Operation;

  updateInstructorName: (
    instructorId: Account.Id,
    name: string,
  ) => Promise<void>;

  // Holds the transaction to the status the caller checked.
  statusUnchangedOperation: (course: Course) => UnitOfWork.Operation;

  addLessonsOperation: (course: Course, delta: number) => UnitOfWork.Operation;

  // A new or renewed enrollment needs a published course; leaving one does not.
  addEnrollmentsOperation: (
    course: Course,
    delta: number,
    options: CourseRepository.EnrollmentCountOptions,
  ) => UnitOfWork.Operation;

  addRatingsOperation: (
    course: Course,
    deltas: CourseRepository.RatingDeltas,
  ) => UnitOfWork.Operation;
}

export namespace CourseRepository {
  export interface ReadOptions {
    consistent?: boolean;
  }

  // Named, so a sum and a count cannot trade places.
  export interface RatingDeltas {
    sumDelta: number;
    countDelta: number;
  }

  export interface EnrollmentCountOptions {
    requirePublished: boolean;
  }
}
