import { beforeEach, describe, expect, it } from 'vitest';

import { courseWorld } from '@tests/support/courseWorld';

import { StudentExport } from '@application/entities/export/StudentExport';
import { ExportPending } from '@application/errors/export';
import { DynamoStudentExportRepository } from '@infra/database/dynamo/repositories/export/DynamoStudentExportRepository';
import { AppConfig } from '@shared/config/AppConfig';

const exports = new DynamoStudentExportRepository(new AppConfig());
let world: Awaited<ReturnType<typeof courseWorld>>;

beforeEach(async () => {
  world = await courseWorld();
});

const exportOf = (minutesAgo = 0) => {
  const created = StudentExport.create({
    courseId: world.course.id,
    requestedBy: world.owner.id,
  });

  return new StudentExport({
    id: created.id,
    courseId: created.courseId,
    requestedBy: created.requestedBy,
    status: created.status,
    rowCount: undefined,
    createdAt: new Date(Date.now() - minutesAgo * 60 * 1000),
  });
};

const start = async (studentExport: StudentExport) => {
  const unit = world.unitOfWork();
  unit.add(
    exports.createOperation(studentExport),
    world.courses.startExportOperation(studentExport),
  );
  await unit.commit();
};

describe('DynamoStudentExportRepository', () => {
  it('should start one export per course and finish it once', async () => {
    const first = exportOf();
    await start(first);

    await expect(start(exportOf())).rejects.toBeInstanceOf(ExportPending);
    await expect(exports.find(first.id)).resolves.toEqual(first);

    first.ready(2);
    await exports.markReady(first);
    first.fail();
    await exports.markFailed(first);
    await world.courses.clearPendingExport(first);

    await expect(exports.find(first.id)).resolves.toMatchObject({
      status: 'READY',
      rowCount: 2,
    });
    await expect(start(exportOf())).resolves.toBeUndefined();
  });

  it('should let a new export start past a pending one that ran out of time', async () => {
    const stuck = exportOf(16);
    await start(stuck);
    const next = exportOf();

    await start(next);
    await world.courses.clearPendingExport(stuck);

    await expect(start(exportOf())).rejects.toBeInstanceOf(ExportPending);
  });

  it('should refuse an export of a course being deleted', async () => {
    await world.courses.markDeleting(world.course.id);

    await expect(start(exportOf())).rejects.toBeInstanceOf(ExportPending);
  });
});
