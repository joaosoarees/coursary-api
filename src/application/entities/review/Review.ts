import type { Account } from '@application/entities/account/Account';
import type { Course } from '@application/entities/course/Course';

export class Review {
  readonly accountId: Account.Id;
  readonly courseId: Course.Id;
  studentName: string;
  rating: number;
  comment: string;
  readonly createdAt: Date;
  updatedAt: Date;

  constructor(attributes: Review.Attributes) {
    this.accountId = attributes.accountId;
    this.courseId = attributes.courseId;
    this.studentName = attributes.studentName;
    this.rating = attributes.rating;
    this.comment = attributes.comment;
    this.createdAt = attributes.createdAt;
    this.updatedAt = attributes.updatedAt;
  }

  changesWith({ rating, comment }: Review.Changes): boolean {
    return rating !== this.rating || comment !== this.comment;
  }

  // Takes the new rating and comment; returns the rating it replaced.
  edit({ rating, comment }: Review.Changes): number {
    const previousRating = this.rating;
    this.rating = rating;
    this.comment = comment;
    this.updatedAt = new Date();

    return previousRating;
  }

  static create({
    student,
    course,
    rating,
    comment,
  }: {
    student: Account;
    course: Course;
  } & Review.Changes): Review {
    const now = new Date();

    return new Review({
      accountId: student.id,
      courseId: course.id,
      studentName: student.name,
      rating,
      comment,
      createdAt: now,
      updatedAt: now,
    });
  }
}

export namespace Review {
  export interface Changes {
    rating: number;
    comment: string;
  }

  export interface Attributes extends Changes {
    accountId: Account.Id;
    courseId: Course.Id;
    studentName: string;
    createdAt: Date;
    updatedAt: Date;
  }
}
