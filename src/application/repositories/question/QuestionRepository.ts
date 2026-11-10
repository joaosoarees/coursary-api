import type { UnitOfWork } from '@application/contracts/UnitOfWork';
import type { Account } from '@application/entities/account/Account';
import type { Lesson } from '@application/entities/outline/Lesson';
import type { Answer } from '@application/entities/question/Answer';
import type { Question } from '@application/entities/question/Question';

export interface QuestionRepository {
  findQuestion: (
    lessonId: Lesson.Id,
    questionId: Question.Id,
  ) => Promise<Question | null>;

  findAnswer: (
    lessonId: Lesson.Id,
    questionId: Question.Id,
    answerId: Answer.Id,
  ) => Promise<Answer | null>;

  askOperation: (question: Question) => UnitOfWork.Operation;

  // The answer and one more on its question's count; refused once the question is removed.
  answerOperations: (answer: Answer) => UnitOfWork.Operation[];

  // Holds to the count the caller read: 'delete' only while unanswered, 'keep' only once answered.
  removeQuestion: (
    question: Question,
    removal: Question.Removal,
  ) => Promise<void>;

  // The answer and one less on its question's count; the last answer of a removed question
  // takes the question with it.
  deleteAnswerOperations: (
    answer: Answer,
    question: Question,
  ) => UnitOfWork.Operation[];

  updateAuthorName: (accountId: Account.Id, name: string) => Promise<void>;

  deleteByLesson: (lessonId: Lesson.Id) => Promise<void>;
}
