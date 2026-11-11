import { Course } from '@application/entities/course/Course';
import type { Lesson } from '@application/entities/outline/Lesson';
import { RealtimeTicket } from '@application/entities/realtime/RealtimeTicket';
import { Forbidden } from '@application/errors/common';
import { LessonNotFound } from '@application/errors/outline';
import type { CourseRepository } from '@application/repositories/course/CourseRepository';
import type { EnrollmentRepository } from '@application/repositories/enrollment/EnrollmentRepository';
import type { LessonRepository } from '@application/repositories/outline/LessonRepository';
import type { RealtimeTicketRepository } from '@application/repositories/realtime/RealtimeTicketRepository';
import type { CourseEditor } from '@application/usecases/course/CourseEditor';

export class IssueRealtimeTicketUseCase {
  constructor(
    private readonly coursesRepository: CourseRepository,
    private readonly enrollmentsRepository: EnrollmentRepository,
    private readonly lessonsRepository: LessonRepository,
    private readonly ticketsRepository: RealtimeTicketRepository,
  ) {}

  async execute({
    callerId,
    callerRole,
    courseId,
    lessonId,
  }: IssueRealtimeTicketUseCase.Input): Promise<IssueRealtimeTicketUseCase.Output> {
    const [found, enrollment, content] = await Promise.all([
      this.coursesRepository.findById(courseId),
      this.enrollmentsRepository.find(callerId, courseId),
      this.lessonsRepository.findContent(courseId, lessonId),
    ]);
    const course = Course.requireFound(found);
    course.requireReadableBy(callerId, callerRole, enrollment);

    // A draft has no questions, so nothing in it changes live.
    if (!course.isVisibleToEveryone()) {
      throw new Forbidden();
    }

    if (!content) {
      throw new LessonNotFound();
    }

    const { ticket, token } = RealtimeTicket.issue({
      accountId: callerId,
      courseId,
      lessonId,
    });
    await this.ticketsRepository.save(ticket);

    return { ticket: token, expiresAt: ticket.expiresAt.toISOString() };
  }
}

export namespace IssueRealtimeTicketUseCase {
  export interface Input extends CourseEditor {
    courseId: Course.Id;
    lessonId: Lesson.Id;
  }

  export interface Output {
    ticket: string;
    expiresAt: string;
  }
}
