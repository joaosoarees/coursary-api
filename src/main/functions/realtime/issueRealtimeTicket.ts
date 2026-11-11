import { IssueRealtimeTicketController } from '@application/controllers/realtime/IssueRealtimeTicketController';
import { IssueRealtimeTicketUseCase } from '@application/usecases/realtime/IssueRealtimeTicketUseCase';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';
import { makeCourseRepository } from '@main/factories/makeCourseRepository';
import { makeEnrollmentRepository } from '@main/factories/makeEnrollmentRepository';
import { makeLessonRepository } from '@main/factories/makeLessonRepository';
import { makeRealtimeTicketRepository } from '@main/factories/makeRealtimeTicketRepository';
import { makeResolveCallerUseCase } from '@main/factories/makeResolveCallerUseCase';

const coursesRepository = makeCourseRepository();
const enrollmentsRepository = makeEnrollmentRepository();
const lessonsRepository = makeLessonRepository();
const ticketsRepository = makeRealtimeTicketRepository();
const issueTicketUseCase = new IssueRealtimeTicketUseCase(
  coursesRepository,
  enrollmentsRepository,
  lessonsRepository,
  ticketsRepository,
);
const controller = new IssueRealtimeTicketController(issueTicketUseCase);
const resolveCaller = makeResolveCallerUseCase();

export const handler = lambdaHttpAdapter(controller, resolveCaller);
