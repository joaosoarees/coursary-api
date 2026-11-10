import type { UnitOfWork } from '@application/contracts/UnitOfWork';
import type { Account } from '@application/entities/account/Account';
import { Course, courseStatuses } from '@application/entities/course/Course';
import type { Lesson } from '@application/entities/outline/Lesson';
import { Answer } from '@application/entities/question/Answer';
import type { Question } from '@application/entities/question/Question';
import { CourseArchived } from '@application/errors/course';
import {
  QuestionNotFound,
  QuestionRemoved,
} from '@application/errors/question';
import { AnswerSummary } from '@application/queries/question/AnswerSummary';
import type { CourseRepository } from '@application/repositories/course/CourseRepository';
import type { EnrollmentRepository } from '@application/repositories/enrollment/EnrollmentRepository';
import type { QuestionRepository } from '@application/repositories/question/QuestionRepository';

export class AnswerQuestionUseCase {
  constructor(
    private readonly coursesRepository: CourseRepository,
    private readonly enrollmentsRepository: EnrollmentRepository,
    private readonly questionsRepository: QuestionRepository,
    private readonly unitOfWork: UnitOfWork.Factory,
  ) {}

  // The course's owner answers without an enrollment; anyone else answers as an enrolled
  // student, held to the enrollment in the same transaction.
  async execute({
    author,
    courseId,
    lessonId,
    questionId,
    text,
  }: AnswerQuestionUseCase.Input): Promise<AnswerSummary> {
    const [found, stored, question] = await Promise.all([
      this.coursesRepository.findById(courseId),
      this.enrollmentsRepository.find(author.id, courseId),
      this.questionsRepository.findQuestion(lessonId, questionId),
    ]);
    const course = Course.requireFound(found);
    const enrollment = course.isOwnedBy(author.id)
      ? null
      : course.requireEnrolledIn(author.id, author.role, stored);

    if (course.status === courseStatuses.Archived) {
      throw new CourseArchived();
    }

    if (question?.courseId !== courseId) {
      throw new QuestionNotFound();
    }

    if (question.removed) {
      throw new QuestionRemoved();
    }

    const answer = Answer.create({ author, question, course, text });
    const unit = this.unitOfWork();
    unit.add(...this.questionsRepository.answerOperations(answer));

    if (enrollment) {
      unit.add(this.enrollmentsRepository.activeOperation(enrollment));
    }

    await unit.commit();

    return AnswerSummary.fromAnswer(answer, true);
  }
}

export namespace AnswerQuestionUseCase {
  export interface Input {
    author: Account;
    courseId: Course.Id;
    lessonId: Lesson.Id;
    questionId: Question.Id;
    text: string;
  }
}
