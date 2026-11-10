import type { Page } from '@application/contracts/Page';
import { Course } from '@application/entities/course/Course';
import type { Lesson } from '@application/entities/outline/Lesson';
import { LessonNotFound } from '@application/errors/outline';
import type { ListQuestionsQuery } from '@application/queries/question/ListQuestionsQuery';
import { QuestionSummary } from '@application/queries/question/QuestionSummary';
import type { CourseRepository } from '@application/repositories/course/CourseRepository';
import type { EnrollmentRepository } from '@application/repositories/enrollment/EnrollmentRepository';
import type { LessonRepository } from '@application/repositories/outline/LessonRepository';
import type { CourseEditor } from '@application/usecases/course/CourseEditor';

export class ListQuestionsUseCase {
  constructor(
    private readonly coursesRepository: CourseRepository,
    private readonly enrollmentsRepository: EnrollmentRepository,
    private readonly lessonsRepository: LessonRepository,
    private readonly listQuestions: ListQuestionsQuery,
  ) {}

  // Whoever may open the lesson reads its questions, an archived course's included.
  async execute({
    callerId,
    callerRole,
    courseId,
    lessonId,
    limit,
    cursor,
  }: ListQuestionsUseCase.Input): Promise<Page<QuestionSummary>> {
    const [found, enrollment, content] = await Promise.all([
      this.coursesRepository.findById(courseId),
      this.enrollmentsRepository.find(callerId, courseId),
      this.lessonsRepository.findContent(courseId, lessonId),
    ]);
    const course = Course.requireFound(found);
    course.requireReadableBy(callerId, callerRole, enrollment);

    if (!content) {
      throw new LessonNotFound();
    }

    const { items, nextCursor } = await this.listQuestions.execute({
      lessonId,
      page: { limit, cursor },
    });

    return {
      items: items.map((question) =>
        QuestionSummary.fromQuestion(
          question,
          question.canBeDeletedBy(callerId, callerRole, course),
        ),
      ),
      nextCursor,
    };
  }
}

export namespace ListQuestionsUseCase {
  export interface Input extends CourseEditor, Page.Options {
    courseId: Course.Id;
    lessonId: Lesson.Id;
  }
}
