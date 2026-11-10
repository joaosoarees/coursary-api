import KSUID from 'ksuid';

import type { Account } from '@application/entities/account/Account';
import type { Course } from '@application/entities/course/Course';
import type { Lesson } from '@application/entities/outline/Lesson';
import { KSUID_PATTERN } from '@application/entities/shared/ksuid';

export class Question {
  readonly id: Question.Id;
  readonly courseId: Course.Id;
  readonly lessonId: Lesson.Id;
  readonly authorId: Account.Id;
  authorName: string;
  text: string;
  answerCount: number;
  removed: boolean;
  readonly createdAt: Date;

  constructor(attributes: Question.Attributes) {
    this.id = attributes.id;
    this.courseId = attributes.courseId;
    this.lessonId = attributes.lessonId;
    this.authorId = attributes.authorId;
    this.authorName = attributes.authorName;
    this.text = attributes.text;
    this.answerCount = attributes.answerCount;
    this.removed = attributes.removed;
    this.createdAt = attributes.createdAt;
  }

  canBeDeletedBy(
    callerId: Account.Id,
    callerRole: Account.Role,
    course: Course,
  ): boolean {
    return (
      !this.removed &&
      (this.authorId === callerId || course.isManagedBy(callerId, callerRole))
    );
  }

  // A question with answers stays, without its text and author, so the answers keep their place.
  remove(): Question.Removal {
    if (this.answerCount === 0) {
      return 'delete';
    }

    this.removed = true;
    this.text = '';
    this.authorName = '';

    return 'keep';
  }

  static isId(value: unknown): value is Question.Id {
    return typeof value === 'string' && KSUID_PATTERN.test(value);
  }

  static toId(value: string): Question.Id {
    if (!Question.isId(value)) {
      throw new TypeError(`Not a question id: ${JSON.stringify(value)}`);
    }

    return value;
  }

  static create({
    author,
    courseId,
    lessonId,
    text,
  }: {
    author: Account;
    courseId: Course.Id;
    lessonId: Lesson.Id;
    text: string;
  }): Question {
    return new Question({
      id: Question.toId(KSUID.randomSync().string),
      courseId,
      lessonId,
      authorId: author.id,
      authorName: author.name,
      text: text.trim(),
      answerCount: 0,
      removed: false,
      createdAt: new Date(),
    });
  }
}

export namespace Question {
  export type Id = string & { readonly __brand: 'Question.Id' };

  export type Removal = 'delete' | 'keep';

  export interface Attributes {
    id: Id;
    courseId: Course.Id;
    lessonId: Lesson.Id;
    authorId: Account.Id;
    authorName: string;
    text: string;
    answerCount: number;
    removed: boolean;
    createdAt: Date;
  }
}
