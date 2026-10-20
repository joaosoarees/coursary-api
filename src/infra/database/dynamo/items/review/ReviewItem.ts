import type { Account } from '@application/entities/account/Account';
import type { Course } from '@application/entities/course/Course';
import { Review } from '@application/entities/review/Review';
import { AccountItem } from '@infra/database/dynamo/items/account/AccountItem';
import { CourseItem } from '@infra/database/dynamo/items/course/CourseItem';

// In the student's partition, with the course's list of reviews in GSI1 (Q73).
export class ReviewItem {
  static readonly type = 'Review';

  private readonly keys: ReviewItem.Keys;

  constructor(private readonly attributes: ReviewItem.Attributes) {
    this.keys = {
      PK: ReviewItem.getPK(attributes.accountId),
      SK: ReviewItem.getSK(attributes.courseId),
      GSI1PK: ReviewItem.getGSI1PK(attributes.courseId),
      GSI1SK: ReviewItem.getGSI1SK(attributes.createdAt, attributes.accountId),
    };
  }

  toItem(): ReviewItem.ItemType {
    return { ...this.keys, ...this.attributes, type: ReviewItem.type };
  }

  static fromEntity(review: Review): ReviewItem {
    return new ReviewItem({
      accountId: review.accountId,
      courseId: review.courseId,
      studentName: review.studentName,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt.toISOString(),
      updatedAt: review.updatedAt.toISOString(),
    });
  }

  static toEntity(item: ReviewItem.ItemType): Review {
    return new Review({
      accountId: item.accountId,
      courseId: item.courseId,
      studentName: item.studentName,
      rating: item.rating,
      comment: item.comment,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
    });
  }

  static getPK(accountId: Account.Id): ReviewItem.Keys['PK'] {
    return AccountItem.getPK(accountId);
  }

  static getSK(courseId: Course.Id): ReviewItem.Keys['SK'] {
    return `REVIEW#${courseId}`;
  }

  static getGSI1PK(courseId: Course.Id): ReviewItem.Keys['GSI1PK'] {
    return CourseItem.getPK(courseId);
  }

  static getGSI1SK(
    createdAt: string,
    accountId: Account.Id,
  ): ReviewItem.Keys['GSI1SK'] {
    return `REVIEW#${createdAt}#${accountId}`;
  }
}

export namespace ReviewItem {
  export interface Keys {
    PK: `ACCOUNT#${string}`;
    SK: `REVIEW#${string}`;
    GSI1PK: `COURSE#${string}`;
    GSI1SK: `REVIEW#${string}#${string}`;
  }

  export interface Attributes {
    accountId: Account.Id;
    courseId: Course.Id;
    studentName: string;
    rating: number;
    comment: string;
    createdAt: string;
    updatedAt: string;
  }

  export type ItemType = Keys & Attributes & { type: 'Review' };
}
