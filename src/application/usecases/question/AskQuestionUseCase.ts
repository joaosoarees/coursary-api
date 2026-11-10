import type { UnitOfWork } from '@application/contracts/UnitOfWork';
import type { Account } from '@application/entities/account/Account';
import { Course, courseStatuses } from '@application/entities/course/Course';
import type { Lesson } from '@application/entities/outline/Lesson';
import { Question } from '@application/entities/question/Question';
import { CourseArchived } from '@application/errors/course';
import { LessonNotFound } from '@application/errors/outline';
import { QuestionSummary } from '@application/queries/question/QuestionSummary';
import type { CourseRepository } from '@application/repositories/course/CourseRepository';
import type { EnrollmentRepository } from '@application/repositories/enrollment/EnrollmentRepository';
import type { LessonRepository } from '@application/repositories/outline/LessonRepository';
import type { QuestionRepository } from '@application/repositories/question/QuestionRepository';

export class AskQuestionUseCase {
  constructor(
    private readonly coursesRepository: CourseRepository,
    private readonly enrollmentsRepository: EnrollmentRepository,
    private readonly lessonsRepository: LessonRepository,
    private readonly questionsRepository: QuestionRepository,
    private readonly unitOfWork: UnitOfWork.Factory,
  ) {}

  // Held to an active enrollment in the same transaction, like a review.
  async execute({
    author,
    courseId,
    lessonId,
    text,
  }: AskQuestionUseCase.Input): Promise<QuestionSummary> {
    const [found, stored, content] = await Promise.all([
      this.coursesRepository.findById(courseId),
      this.enrollmentsRepository.find(author.id, courseId),
      this.lessonsRepository.findContent(courseId, lessonId),
    ]);
    const course = Course.requireFound(found);
    const enrollment = course.requireEnrolledIn(author.id, author.role, stored);

    if (course.status === courseStatuses.Archived) {
      throw new CourseArchived();
    }

    if (!content) {
      throw new LessonNotFound();
    }

    const question = Question.create({ author, courseId, lessonId, text });
    const unit = this.unitOfWork();
    unit.add(
      this.enrollmentsRepository.activeOperation(enrollment),
      this.questionsRepository.askOperation(question),
    );
    await unit.commit();

    return QuestionSummary.fromQuestion(question, true);
  }
}

export namespace AskQuestionUseCase {
  export interface Input {
    author: Account;
    courseId: Course.Id;
    lessonId: Lesson.Id;
    text: string;
  }
}
