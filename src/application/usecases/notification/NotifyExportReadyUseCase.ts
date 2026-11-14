import {
  exportStatuses,
  type StudentExport,
} from '@application/entities/export/StudentExport';
import {
  Notification,
  notificationKinds,
} from '@application/entities/notification/Notification';
import type { CourseRepository } from '@application/repositories/course/CourseRepository';
import type { StudentExportRepository } from '@application/repositories/export/StudentExportRepository';
import type { NotificationRepository } from '@application/repositories/notification/NotificationRepository';

// Who asked for the students' CSV hears it is ready, even after leaving the page.
export class NotifyExportReadyUseCase {
  constructor(
    private readonly exportsRepository: StudentExportRepository,
    private readonly coursesRepository: CourseRepository,
    private readonly notificationsRepository: NotificationRepository,
  ) {}

  async execute({
    exportId,
    occurredAt,
  }: NotifyExportReadyUseCase.Input): Promise<Notification[]> {
    const studentExport = await this.exportsRepository.find(exportId);

    if (studentExport?.status !== exportStatuses.Ready) {
      return [];
    }

    const course = await this.coursesRepository.findById(
      studentExport.courseId,
    );

    if (!course) {
      return [];
    }

    const notification = Notification.create({
      accountId: studentExport.requestedBy,
      kind: notificationKinds.ExportReady,
      courseId: course.id,
      courseTitle: course.title,
      lessonId: undefined,
      lessonTitle: undefined,
      questionId: undefined,
      actorName: undefined,
      byInstructor: false,
      exportId,
      sourceId: exportId,
      occurredAt: new Date(occurredAt),
    });

    return (await this.notificationsRepository.saveIfNew(notification))
      ? [notification]
      : [];
  }
}

export namespace NotifyExportReadyUseCase {
  export interface Input {
    exportId: StudentExport.Id;
    occurredAt: string;
  }
}
