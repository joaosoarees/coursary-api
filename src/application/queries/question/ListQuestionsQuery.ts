import type { Page } from '@application/contracts/Page';
import type { Lesson } from '@application/entities/outline/Lesson';
import type { Question } from '@application/entities/question/Question';

// Entities, not summaries: what the caller may delete is decided by the use case.
export interface ListQuestionsQuery {
  execute: (input: ListQuestionsQuery.Input) => Promise<Page<Question>>;
}

export namespace ListQuestionsQuery {
  export interface Input {
    lessonId: Lesson.Id;
    page: Page.Options;
  }
}
