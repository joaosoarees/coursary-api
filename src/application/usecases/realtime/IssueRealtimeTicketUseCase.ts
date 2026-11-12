import { Course } from '@application/entities/course/Course';
import type { RealtimeLesson } from '@application/entities/realtime/RealtimeLesson';
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
    lesson,
  }: IssueRealtimeTicketUseCase.Input): Promise<IssueRealtimeTicketUseCase.Output> {
    // Without a lesson the connection only hears the caller's own news: the session is enough.
    if (lesson) {
      await this.requireReadable(callerId, callerRole, lesson);
    }

    const { ticket, token } = RealtimeTicket.issue({
      accountId: callerId,
      lesson,
    });
    await this.ticketsRepository.save(ticket);

    return { ticket: token, expiresAt: ticket.expiresAt.toISOString() };
  }

  private async requireReadable(
    callerId: CourseEditor['callerId'],
    callerRole: CourseEditor['callerRole'],
    { courseId, lessonId }: RealtimeLesson,
  ): Promise<void> {
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
  }
}

export namespace IssueRealtimeTicketUseCase {
  export interface Input extends CourseEditor {
    lesson: RealtimeLesson | undefined;
  }

  export interface Output {
    ticket: string;
    expiresAt: string;
  }
}
