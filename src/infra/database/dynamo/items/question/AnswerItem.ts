import type { Account } from '@application/entities/account/Account';
import type { Course } from '@application/entities/course/Course';
import type { Lesson } from '@application/entities/outline/Lesson';
import { Answer } from '@application/entities/question/Answer';
import type { Question } from '@application/entities/question/Question';
import { QuestionItem } from '@infra/database/dynamo/items/question/QuestionItem';

// In the lesson's partition, after its question's id so one prefix lists a question's answers.
export class AnswerItem {
  static readonly type = 'Answer';

  private readonly keys: AnswerItem.Keys;

  constructor(private readonly attributes: AnswerItem.Attributes) {
    this.keys = {
      PK: AnswerItem.getPK(attributes.lessonId),
      SK: AnswerItem.getSK(attributes.questionId, attributes.id),
      GSI1PK: QuestionItem.getGSI1PK(attributes.authorId),
      GSI1SK: QuestionItem.getGSI1SK(attributes.id),
    };
  }

  toItem(): AnswerItem.ItemType {
    return { ...this.keys, ...this.attributes, type: AnswerItem.type };
  }

  static fromEntity(answer: Answer): AnswerItem {
    return new AnswerItem({
      id: answer.id,
      courseId: answer.courseId,
      lessonId: answer.lessonId,
      questionId: answer.questionId,
      authorId: answer.authorId,
      authorName: answer.authorName,
      text: answer.text,
      byInstructor: answer.byInstructor,
      createdAt: answer.createdAt.toISOString(),
    });
  }

  static toEntity(item: AnswerItem.ItemType): Answer {
    return new Answer({
      id: item.id,
      courseId: item.courseId,
      lessonId: item.lessonId,
      questionId: item.questionId,
      authorId: item.authorId,
      authorName: item.authorName,
      text: item.text,
      byInstructor: item.byInstructor,
      createdAt: new Date(item.createdAt),
    });
  }

  static getPK(lessonId: Lesson.Id): AnswerItem.Keys['PK'] {
    return QuestionItem.getPK(lessonId);
  }

  static getSK(questionId: Question.Id, id: Answer.Id): AnswerItem.Keys['SK'] {
    return `${AnswerItem.prefixOf(questionId)}${id}`;
  }

  static prefixOf(questionId: Question.Id): `ANSWER#${string}#` {
    return `ANSWER#${questionId}#`;
  }
}

export namespace AnswerItem {
  export interface Keys {
    PK: `LESSON#${string}`;
    SK: `ANSWER#${string}#${string}`;
    GSI1PK: `AUTHOR#${string}`;
    GSI1SK: `POST#${string}`;
  }

  export interface Attributes {
    id: Answer.Id;
    courseId: Course.Id;
    lessonId: Lesson.Id;
    questionId: Question.Id;
    authorId: Account.Id;
    authorName: string;
    text: string;
    byInstructor: boolean;
    createdAt: string;
  }

  export type ItemType = Keys & Attributes & { type: 'Answer' };
}
