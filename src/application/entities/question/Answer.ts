import KSUID from 'ksuid';

import type { Account } from '@application/entities/account/Account';
import type { Course } from '@application/entities/course/Course';
import type { Question } from '@application/entities/question/Question';
import { KSUID_PATTERN } from '@application/entities/shared/ksuid';

export class Answer {
  readonly id: Answer.Id;
  readonly courseId: Course.Id;
  readonly lessonId: Question['lessonId'];
  readonly questionId: Question.Id;
  readonly authorId: Account.Id;
  authorName: string;
  readonly text: string;
  readonly byInstructor: boolean;
  readonly createdAt: Date;

  constructor(attributes: Answer.Attributes) {
    this.id = attributes.id;
    this.courseId = attributes.courseId;
    this.lessonId = attributes.lessonId;
    this.questionId = attributes.questionId;
    this.authorId = attributes.authorId;
    this.authorName = attributes.authorName;
    this.text = attributes.text;
    this.byInstructor = attributes.byInstructor;
    this.createdAt = attributes.createdAt;
  }

  canBeDeletedBy(
    callerId: Account.Id,
    callerRole: Account.Role,
    course: Course,
  ): boolean {
    return (
      this.authorId === callerId || course.isManagedBy(callerId, callerRole)
    );
  }

  static isId(value: unknown): value is Answer.Id {
    return typeof value === 'string' && KSUID_PATTERN.test(value);
  }

  static toId(value: string): Answer.Id {
    if (!Answer.isId(value)) {
      throw new TypeError(`Not an answer id: ${JSON.stringify(value)}`);
    }

    return value;
  }

  static create({
    author,
    question,
    course,
    text,
  }: {
    author: Account;
    question: Question;
    course: Course;
    text: string;
  }): Answer {
    return new Answer({
      id: Answer.toId(KSUID.randomSync().string),
      courseId: question.courseId,
      lessonId: question.lessonId,
      questionId: question.id,
      authorId: author.id,
      authorName: author.name,
      text: text.trim(),
      byInstructor: course.isOwnedBy(author.id),
      createdAt: new Date(),
    });
  }
}

export namespace Answer {
  export type Id = string & { readonly __brand: 'Answer.Id' };

  export interface Attributes {
    id: Id;
    courseId: Course.Id;
    lessonId: Question['lessonId'];
    questionId: Question.Id;
    authorId: Account.Id;
    authorName: string;
    text: string;
    byInstructor: boolean;
    createdAt: Date;
  }
}
