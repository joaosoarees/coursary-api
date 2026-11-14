import { beforeEach, describe, expect, it } from 'vitest';

import { notifyWorld } from '@tests/support/notifyWorld';

import { StudentExport } from '@application/entities/export/StudentExport';
import { NotifyExportReadyUseCase } from '@application/usecases/notification/NotifyExportReadyUseCase';

const occurredAt = '2026-11-13T12:00:00.000Z';
let world: Awaited<ReturnType<typeof notifyWorld>>;

beforeEach(async () => {
  world = await notifyWorld();
});

const requestExport = async () => {
  const studentExport = StudentExport.create({
    courseId: world.course.id,
    requestedBy: world.admin.id,
  });
  const unit = world.unitOfWork();
  unit.add(
    world.studentExports.createOperation(studentExport),
    world.courses.startExportOperation(studentExport),
  );
  await unit.commit();

  return studentExport;
};

const notify = (studentExport: StudentExport) =>
  new NotifyExportReadyUseCase(
    world.studentExports,
    world.courses,
    world.notifications,
  ).execute({ exportId: studentExport.id, occurredAt });

describe('NotifyExportReadyUseCase', () => {
  it('should tell who asked for the CSV, not the owner, that it is ready, once', async () => {
    const studentExport = await requestExport();
    studentExport.ready(3);
    await world.studentExports.markReady(studentExport);

    await expect(notify(studentExport)).resolves.toHaveLength(1);
    await expect(notify(studentExport)).resolves.toEqual([]);

    await expect(world.inbox(world.admin)).resolves.toMatchObject([
      {
        kind: 'export-ready',
        courseId: world.course.id,
        courseTitle: world.course.title,
        exportId: studentExport.id,
      },
    ]);
    await expect(world.inbox(world.owner)).resolves.toEqual([]);
  });

  it('should say nothing of an export not ready, or of a deleted course', async () => {
    const pending = await requestExport();

    await expect(notify(pending)).resolves.toEqual([]);

    pending.ready(3);
    await world.studentExports.markReady(pending);
    await world.courses.archive(world.course.id, new Date());
    await world.courses.markDeleting(world.course.id);

    await expect(notify(pending)).resolves.toEqual([]);
    await expect(world.inbox(world.admin)).resolves.toEqual([]);
  });
});
