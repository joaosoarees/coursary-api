import type { UnitOfWork } from '@application/contracts/UnitOfWork';
import type { Account } from '@application/entities/account/Account';
import { Course } from '@application/entities/course/Course';
import { Review } from '@application/entities/review/Review';
import type { CourseRepository } from '@application/repositories/course/CourseRepository';
import type { EnrollmentRepository } from '@application/repositories/enrollment/EnrollmentRepository';
import type { ReviewRepository } from '@application/repositories/review/ReviewRepository';
import { ReviewDetails } from '@application/usecases/review/ReviewDetails';

export class ReviewCourseUseCase {
  constructor(
    private readonly coursesRepository: CourseRepository,
    private readonly enrollmentsRepository: EnrollmentRepository,
    private readonly reviewsRepository: ReviewRepository,
    private readonly unitOfWork: UnitOfWork.Factory,
  ) {}

  // Creates or edits the student's single review; the course counters move in
  // the same transaction, held to an active enrollment (Q47, Q83, Q282).
  async execute({
    student,
    courseId,
    rating,
    comment,
  }: ReviewCourseUseCase.Input): Promise<ReviewCourseUseCase.Output> {
    const [found, stored, existing] = await Promise.all([
      this.coursesRepository.findById(courseId),
      this.enrollmentsRepository.find(student.id, courseId),
      this.reviewsRepository.find(student.id, courseId),
    ]);
    const course = Course.requireFound(found);
    const enrollment = course.requireEnrolledIn(
      student.id,
      student.role,
      stored,
    );

    if (existing && !existing.changesWith({ rating, comment })) {
      return { review: ReviewDetails.fromReview(existing), created: false };
    }

    const unit = this.unitOfWork();
    unit.add(this.enrollmentsRepository.activeOperation(enrollment));

    if (existing) {
      const previousRating = existing.edit({ rating, comment });
      unit.add(
        this.reviewsRepository.updateOperation(existing, previousRating),
      );

      if (rating !== previousRating) {
        unit.add(
          this.coursesRepository.addRatingsOperation(course, {
            sumDelta: rating - previousRating,
            countDelta: 0,
          }),
        );
      }

      await unit.commit();

      return { review: ReviewDetails.fromReview(existing), created: false };
    }

    const review = Review.create({ student, course, rating, comment });
    unit.add(
      this.reviewsRepository.createOperation(review),
      this.coursesRepository.addRatingsOperation(course, {
        sumDelta: rating,
        countDelta: 1,
      }),
    );
    await unit.commit();

    return { review: ReviewDetails.fromReview(review), created: true };
  }
}

export namespace ReviewCourseUseCase {
  export interface Input extends Review.Changes {
    student: Account;
    courseId: Course.Id;
  }

  export interface Output {
    review: ReviewDetails;
    created: boolean;
  }
}
