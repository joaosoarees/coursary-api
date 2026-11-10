import type { Page } from '@application/contracts/Page';
import { Course } from '@application/entities/course/Course';
import type { Lesson } from '@application/entities/outline/Lesson';
import type { Question } from '@application/entities/question/Question';
import { QuestionNotFound } from '@application/errors/question';
import { AnswerSummary } from '@application/queries/question/AnswerSummary';
import type { ListAnswersQuery } from '@application/queries/question/ListAnswersQuery';
import type { CourseRepository } from '@application/repositories/course/CourseRepository';
import type { EnrollmentRepository } from '@application/repositories/enrollment/EnrollmentRepository';
import type { QuestionRepository } from '@application/repositories/question/QuestionRepository';
import type { CourseEditor } from '@application/usecases/course/CourseEditor';

export class ListAnswersUseCase {
  constructor(
    private readonly coursesRepository: CourseRepository,
    private readonly enrollmentsRepository: EnrollmentRepository,
    private readonly questionsRepository: QuestionRepository,
    private readonly listAnswers: ListAnswersQuery,
  ) {}

  async execute({
    callerId,
    callerRole,
    courseId,
    lessonId,
    questionId,
    limit,
    cursor,
  }: ListAnswersUseCase.Input): Promise<Page<AnswerSummary>> {
    const [found, enrollment, question] = await Promise.all([
      this.coursesRepository.findById(courseId),
      this.enrollmentsRepository.find(callerId, courseId),
      this.questionsRepository.findQuestion(lessonId, questionId),
    ]);
    const course = Course.requireFound(found);
    course.requireReadableBy(callerId, callerRole, enrollment);

    if (question?.courseId !== courseId) {
      throw new QuestionNotFound();
    }

    const { items, nextCursor } = await this.listAnswers.execute({
      lessonId,
      questionId,
      page: { limit, cursor },
    });

    return {
      items: items.map((answer) =>
        AnswerSummary.fromAnswer(
          answer,
          answer.canBeDeletedBy(callerId, callerRole, course),
        ),
      ),
      nextCursor,
    };
  }
}

export namespace ListAnswersUseCase {
  export interface Input extends CourseEditor, Page.Options {
    courseId: Course.Id;
    lessonId: Lesson.Id;
    questionId: Question.Id;
  }
}
