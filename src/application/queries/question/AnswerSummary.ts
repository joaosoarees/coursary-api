import type { Answer } from '@application/entities/question/Answer';

export class AnswerSummary {
  readonly id: string;
  readonly authorName: string;
  readonly text: string;
  readonly createdAt: string;
  readonly byInstructor: boolean;
  readonly canDelete: boolean;

  constructor(attributes: AnswerSummary) {
    this.id = attributes.id;
    this.authorName = attributes.authorName;
    this.text = attributes.text;
    this.createdAt = attributes.createdAt;
    this.byInstructor = attributes.byInstructor;
    this.canDelete = attributes.canDelete;
  }

  // canDelete is for the caller; the author's id never leaves the API.
  static fromAnswer(answer: Answer, canDelete: boolean): AnswerSummary {
    return new AnswerSummary({
      id: answer.id,
      authorName: answer.authorName,
      text: answer.text,
      createdAt: answer.createdAt.toISOString(),
      byInstructor: answer.byInstructor,
      canDelete,
    });
  }
}
