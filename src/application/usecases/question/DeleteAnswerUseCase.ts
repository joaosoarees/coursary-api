import type { UnitOfWork } from '@application/contracts/UnitOfWork';
import { Course } from '@application/entities/course/Course';
import type { Lesson } from '@application/entities/outline/Lesson';
import type { Answer } from '@application/entities/question/Answer';
import type { Question } from '@application/entities/question/Question';
import { Forbidden } from '@application/errors/common';
import { AnswerNotFound } from '@application/errors/question';
import type { CourseRepository } from '@application/repositories/course/CourseRepository';
import type { EnrollmentRepository } from '@application/repositories/enrollment/EnrollmentRepository';
import type { QuestionRepository } from '@application/repositories/question/QuestionRepository';
import type { CourseEditor } from '@application/usecases/course/CourseEditor';

export class DeleteAnswerUseCase {
  constructor(
    private readonly coursesRepository: CourseRepository,
    private readonly enrollmentsRepository: EnrollmentRepository,
    private readonly questionsRepository: QuestionRepository,
    private readonly unitOfWork: UnitOfWork.Factory,
  ) {}

  async execute({
    callerId,
    callerRole,
    courseId,
    lessonId,
    questionId,
    answerId,
  }: DeleteAnswerUseCase.Input): Promise<void> {
    const [found, enrollment, question, answer] = await Promise.all([
      this.coursesRepository.findById(courseId),
      this.enrollmentsRepository.find(callerId, courseId),
      this.questionsRepository.findQuestion(lessonId, questionId),
      this.questionsRepository.findAnswer(lessonId, questionId, answerId),
    ]);
    const course = Course.requireFound(found);
    course.requireReadableBy(callerId, callerRole, enrollment);

    if (!question || answer?.courseId !== courseId) {
      throw new AnswerNotFound();
    }

    if (!answer.canBeDeletedBy(callerId, callerRole, course)) {
      throw new Forbidden();
    }

    const unit = this.unitOfWork();
    unit.add(
      ...this.questionsRepository.deleteAnswerOperations(answer, question),
    );
    await unit.commit();
  }
}

export namespace DeleteAnswerUseCase {
  export interface Input extends CourseEditor {
    courseId: Course.Id;
    lessonId: Lesson.Id;
    questionId: Question.Id;
    answerId: Answer.Id;
  }
}
