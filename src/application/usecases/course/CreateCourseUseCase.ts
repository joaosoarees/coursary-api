import { Account } from '@application/entities/account/Account';
import { Course } from '@application/entities/course/Course';
import type { PublicAssetUrls } from '@application/gateways/file/PublicAssetUrls';
import type { CourseRepository } from '@application/repositories/course/CourseRepository';
import { CourseDetails } from '@application/usecases/course/CourseDetails';

export class CreateCourseUseCase {
  constructor(
    private readonly coursesRepository: CourseRepository,
    private readonly assetUrls?: PublicAssetUrls,
  ) {}

  async execute({
    instructor,
    title,
    description,
  }: CreateCourseUseCase.Input): Promise<CourseDetails> {
    const activeInstructor = Account.requireActive(instructor);
    const course = Course.create({
      instructor: activeInstructor,
      title,
    });

    await this.coursesRepository.create(course, description);

    return CourseDetails.fromCourse(course, description, this.assetUrls);
  }
}

export namespace CreateCourseUseCase {
  export interface Input {
    instructor: Account;
    title: string;
    description: string;
  }
}
