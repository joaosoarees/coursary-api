import type { Account } from '@application/entities/account/Account';
import type { Course } from '@application/entities/course/Course';
import type { Lesson } from '@application/entities/outline/Lesson';
import { Question } from '@application/entities/question/Question';
import { LessonContentItem } from '@infra/database/dynamo/items/outline/LessonContentItem';

// In the lesson's partition; GSI1 gathers an author's posts, for a change of name.
export class QuestionItem {
  static readonly type = 'Question';

  private readonly keys: QuestionItem.Keys;

  constructor(private readonly attributes: QuestionItem.Attributes) {
    this.keys = {
      PK: QuestionItem.getPK(attributes.lessonId),
      SK: QuestionItem.getSK(attributes.id),
      // A removed question has no author left to rename.
      ...(attributes.removed
        ? {}
        : {
            GSI1PK: QuestionItem.getGSI1PK(attributes.authorId),
            GSI1SK: QuestionItem.getGSI1SK(attributes.id),
          }),
    };
  }

  toItem(): QuestionItem.ItemType {
    return { ...this.keys, ...this.attributes, type: QuestionItem.type };
  }

  static fromEntity(question: Question): QuestionItem {
    return new QuestionItem({
      id: question.id,
      courseId: question.courseId,
      lessonId: question.lessonId,
      authorId: question.authorId,
      authorName: question.authorName,
      text: question.text,
      answerCount: question.answerCount,
      removed: question.removed,
      createdAt: question.createdAt.toISOString(),
    });
  }

  static toEntity(item: QuestionItem.ItemType): Question {
    return new Question({
      id: item.id,
      courseId: item.courseId,
      lessonId: item.lessonId,
      authorId: item.authorId,
      authorName: item.authorName,
      text: item.text,
      answerCount: item.answerCount,
      removed: item.removed,
      createdAt: new Date(item.createdAt),
    });
  }

  static getPK(lessonId: Lesson.Id): QuestionItem.Keys['PK'] {
    return LessonContentItem.getPK(lessonId);
  }

  static getSK(id: Question.Id): QuestionItem.Keys['SK'] {
    return `QUESTION#${id}`;
  }

  static getGSI1PK(
    authorId: Account.Id,
  ): NonNullable<QuestionItem.Keys['GSI1PK']> {
    return `AUTHOR#${authorId}`;
  }

  static getGSI1SK(id: string): NonNullable<QuestionItem.Keys['GSI1SK']> {
    return `POST#${id}`;
  }
}

export namespace QuestionItem {
  export interface Keys {
    PK: `LESSON#${string}`;
    SK: `QUESTION#${string}`;
    GSI1PK?: `AUTHOR#${string}`;
    GSI1SK?: `POST#${string}`;
  }

  export interface Attributes {
    id: Question.Id;
    courseId: Course.Id;
    lessonId: Lesson.Id;
    authorId: Account.Id;
    authorName: string;
    text: string;
    answerCount: number;
    removed: boolean;
    createdAt: string;
  }

  export type ItemType = Keys & Attributes & { type: 'Question' };
}
