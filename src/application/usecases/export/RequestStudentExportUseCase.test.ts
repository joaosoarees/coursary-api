import { beforeEach, describe, expect, it } from 'vitest';

import { courseWorld } from '@tests/support/courseWorld';

import { Forbidden } from '@application/errors/common';
import { CourseNotFound } from '@application/errors/course';
import { ExportPending } from '@application/errors/export';
import { RequestStudentExportUseCase } from '@application/usecases/export/RequestStudentExportUseCase';
let world: Awaited<ReturnType<typeof courseWorld>>;
let requestExport: RequestStudentExportUseCase;

beforeEach(async () => {
  world = await courseWorld();
  requestExport = new RequestStudentExportUseCase(
    world.courses,
    world.studentExports,
    world.unitOfWork,
  );
});

describe('RequestStudentExportUseCase', () => {
  it('should record a pending export for the owner, and only one at a time', async () => {
    const requested = await requestExport.execute(world.as(world.owner));

    expect(requested).toMatchObject({
      courseId: world.course.id,
      status: 'PENDING',
      rowCount: null,
    });
    expect(requested.downloadUrl).toBeUndefined();
    await expect(
      world.studentExports.find(requested.id),
    ).resolves.toMatchObject({
      requestedBy: world.owner.id,
      status: 'PENDING',
    });
    await expect(
      requestExport.execute(world.as(world.admin)),
    ).rejects.toBeInstanceOf(ExportPending);
  });

  it('should serve an admin and an archived course', async () => {
    await world.setCourse({ status: 'ARCHIVED' });

    const requested = await requestExport.execute(world.as(world.admin));

    await expect(
      world.studentExports.find(requested.id),
    ).resolves.toMatchObject({ requestedBy: world.admin.id });
  });

  it('should refuse another instructor', async () => {
    await expect(
      requestExport.execute(world.as(world.other)),
    ).rejects.toBeInstanceOf(CourseNotFound);

    await world.setCourse({ status: 'PUBLISHED' });

    await expect(
      requestExport.execute(world.as(world.other)),
    ).rejects.toBeInstanceOf(Forbidden);
  });
});
