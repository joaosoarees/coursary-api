import type { Question } from '@application/entities/question/Question';

export class QuestionSummary {
  readonly id: string;
  readonly authorName: string;
  readonly text: string;
  readonly createdAt: string;
  readonly answerCount: number;
  readonly removed: boolean;
  readonly canDelete: boolean;

  constructor(attributes: QuestionSummary) {
    this.id = attributes.id;
    this.authorName = attributes.authorName;
    this.text = attributes.text;
    this.createdAt = attributes.createdAt;
    this.answerCount = attributes.answerCount;
    this.removed = attributes.removed;
    this.canDelete = attributes.canDelete;
  }

  // canDelete is for the caller; the author's id never leaves the API.
  static fromQuestion(question: Question, canDelete: boolean): QuestionSummary {
    return new QuestionSummary({
      id: question.id,
      authorName: question.authorName,
      text: question.text,
      createdAt: question.createdAt.toISOString(),
      answerCount: question.answerCount,
      removed: question.removed,
      canDelete,
    });
  }
}
