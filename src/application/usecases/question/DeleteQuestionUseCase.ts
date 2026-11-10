import { Course } from '@application/entities/course/Course';
import type { Lesson } from '@application/entities/outline/Lesson';
import type { Question } from '@application/entities/question/Question';
import { Forbidden } from '@application/errors/common';
import { QuestionNotFound } from '@application/errors/question';
import type { CourseRepository } from '@application/repositories/course/CourseRepository';
import type { EnrollmentRepository } from '@application/repositories/enrollment/EnrollmentRepository';
import type { QuestionRepository } from '@application/repositories/question/QuestionRepository';
import type { CourseEditor } from '@application/usecases/course/CourseEditor';

export class DeleteQuestionUseCase {
  constructor(
    private readonly coursesRepository: CourseRepository,
    private readonly enrollmentsRepository: EnrollmentRepository,
    private readonly questionsRepository: QuestionRepository,
  ) {}

  async execute({
    callerId,
    callerRole,
    courseId,
    lessonId,
    questionId,
  }: DeleteQuestionUseCase.Input): Promise<void> {
    const [found, enrollment, question] = await Promise.all([
      this.coursesRepository.findById(courseId),
      this.enrollmentsRepository.find(callerId, courseId),
      this.questionsRepository.findQuestion(lessonId, questionId),
    ]);
    const course = Course.requireFound(found);
    course.requireReadableBy(callerId, callerRole, enrollment);

    if (question?.courseId !== courseId || question.removed) {
      throw new QuestionNotFound();
    }

    if (!question.canBeDeletedBy(callerId, callerRole, course)) {
      throw new Forbidden();
    }

    const removal = question.remove();
    await this.questionsRepository.removeQuestion(question, removal);
  }
}

export namespace DeleteQuestionUseCase {
  export interface Input extends CourseEditor {
    courseId: Course.Id;
    lessonId: Lesson.Id;
    questionId: Question.Id;
  }
}
