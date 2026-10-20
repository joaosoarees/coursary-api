import type { UnitOfWork } from '@application/contracts/UnitOfWork';
import type { Account } from '@application/entities/account/Account';
import { Course, courseStatuses } from '@application/entities/course/Course';
import { Enrollment } from '@application/entities/enrollment/Enrollment';
import { CourseArchived, CourseNotFound } from '@application/errors/course';
import { OwnCourse } from '@application/errors/enrollment';
import type { CourseRepository } from '@application/repositories/course/CourseRepository';
import type { EnrollmentRepository } from '@application/repositories/enrollment/EnrollmentRepository';
import { EnrollmentDetails } from '@application/usecases/enrollment/EnrollmentDetails';

export class EnrollUseCase {
  constructor(
    private readonly coursesRepository: CourseRepository,
    private readonly enrollmentsRepository: EnrollmentRepository,
    private readonly unitOfWork: UnitOfWork.Factory,
  ) {}

  // Enrolling again keeps the first enrolledAt (Q239, Q242, Q243).
  async execute({
    student,
    courseId,
  }: EnrollUseCase.Input): Promise<EnrollUseCase.Output> {
    const found = await this.coursesRepository.findById(courseId);
    const course = Course.requireFound(found);

    if (course.isOwnedBy(student.id)) {
      throw new OwnCourse();
    }

    if (course.status === courseStatuses.Draft) {
      throw new CourseNotFound();
    }

    if (course.status === courseStatuses.Archived) {
      throw new CourseArchived();
    }

    const existing = await this.enrollmentsRepository.find(
      student.id,
      courseId,
    );

    if (existing?.isActive()) {
      return {
        enrollment: EnrollmentDetails.fromEnrollment(existing),
        created: false,
      };
    }

    const enrollment = existing ?? Enrollment.create({ student, course });
    const unit = this.unitOfWork();
    unit.add(
      existing
        ? this.enrollmentsRepository.reactivateOperation(enrollment)
        : this.enrollmentsRepository.createOperation(enrollment),
      this.coursesRepository.addEnrollmentsOperation(course, 1, {
        requirePublished: true,
      }),
    );
    await unit.commit();
    enrollment.activate();

    return {
      enrollment: EnrollmentDetails.fromEnrollment(enrollment),
      created: !existing,
    };
  }
}

export namespace EnrollUseCase {
  export interface Input {
    student: Account;
    courseId: Course.Id;
  }

  export interface Output {
    enrollment: EnrollmentDetails;
    created: boolean;
  }
}
