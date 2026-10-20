import { Account } from '@application/entities/account/Account';
import type { AccountRepository } from '@application/repositories/account/AccountRepository';
import type { CourseRepository } from '@application/repositories/course/CourseRepository';
import type { EnrollmentRepository } from '@application/repositories/enrollment/EnrollmentRepository';
import type { ReviewRepository } from '@application/repositories/review/ReviewRepository';
import { AccountProfile } from '@application/usecases/account/AccountProfile';

export class UpdateMeUseCase {
  constructor(
    private readonly accountsRepository: AccountRepository,
    private readonly coursesRepository: CourseRepository,
    private readonly enrollmentsRepository: EnrollmentRepository,
    private readonly reviewsRepository: ReviewRepository,
  ) {}

  async execute({
    account,
    name,
  }: UpdateMeUseCase.Input): Promise<AccountProfile> {
    const { id } = Account.requireActive(account);

    const updated = await this.accountsRepository.updateName(id, name);
    await Promise.all([
      this.coursesRepository.updateInstructorName(id, updated.name),
      this.enrollmentsRepository.updateStudentName(id, updated.name),
      this.reviewsRepository.updateStudentName(id, updated.name),
    ]);

    return AccountProfile.fromAccount(updated);
  }
}

export namespace UpdateMeUseCase {
  export interface Input {
    account: Account;
    name: string;
  }
}
