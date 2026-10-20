import type { UnitOfWork } from '@application/contracts/UnitOfWork';
import type { Account } from '@application/entities/account/Account';
import { Course } from '@application/entities/course/Course';
import { EnrollmentNotFound } from '@application/errors/enrollment';
import type { CourseRepository } from '@application/repositories/course/CourseRepository';
import type { EnrollmentRepository } from '@application/repositories/enrollment/EnrollmentRepository';

export class CancelEnrollmentUseCase {
  constructor(
    private readonly coursesRepository: CourseRepository,
    private readonly enrollmentsRepository: EnrollmentRepository,
    private readonly unitOfWork: UnitOfWork.Factory,
  ) {}

  // Cancelling twice answers the same; the enrollment stays, cancelled (Q242).
  async execute({
    callerId,
    courseId,
  }: CancelEnrollmentUseCase.Input): Promise<void> {
    const [enrollment, found] = await Promise.all([
      this.enrollmentsRepository.find(callerId, courseId),
      this.coursesRepository.findById(courseId),
    ]);

    if (!enrollment) {
      throw new EnrollmentNotFound();
    }

    if (!enrollment.isActive()) {
      return;
    }

    const course = Course.requireFound(found);
    const unit = this.unitOfWork();
    unit.add(
      this.enrollmentsRepository.cancelOperation(enrollment),
      this.coursesRepository.addEnrollmentsOperation(course, -1, {
        requirePublished: false,
      }),
    );
    await unit.commit();
  }
}

export namespace CancelEnrollmentUseCase {
  export interface Input {
    callerId: Account.Id;
    courseId: Course.Id;
  }
}
