import type { Page } from '@application/contracts/Page';
import type { Lesson } from '@application/entities/outline/Lesson';
import type { Answer } from '@application/entities/question/Answer';
import type { Question } from '@application/entities/question/Question';

// Entities, not summaries: what the caller may delete is decided by the use case.
export interface ListAnswersQuery {
  execute: (input: ListAnswersQuery.Input) => Promise<Page<Answer>>;
}

export namespace ListAnswersQuery {
  export interface Input {
    lessonId: Lesson.Id;
    questionId: Question.Id;
    page: Page.Options;
  }
}
