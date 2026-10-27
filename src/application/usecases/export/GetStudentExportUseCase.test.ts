import { beforeEach, describe, expect, it } from 'vitest';

import { FakeFileStorage } from '@tests/fakes/FakeFileStorage';
import { courseWorld } from '@tests/support/courseWorld';

import { StudentExport } from '@application/entities/export/StudentExport';
import { ExportNotFound } from '@application/errors/export';
import { GetStudentExportUseCase } from '@application/usecases/export/GetStudentExportUseCase';
import { ProcessStudentExportUseCase } from '@application/usecases/export/ProcessStudentExportUseCase';
import { RequestStudentExportUseCase } from '@application/usecases/export/RequestStudentExportUseCase';

let world: Awaited<ReturnType<typeof courseWorld>>;
let storage: FakeFileStorage;
let requestExport: RequestStudentExportUseCase;
let processExport: ProcessStudentExportUseCase;
let getExport: GetStudentExportUseCase;

beforeEach(async () => {
  world = await courseWorld();
  storage = new FakeFileStorage();
  requestExport = new RequestStudentExportUseCase(
    world.courses,
    world.studentExports,
    world.unitOfWork,
  );
  processExport = new ProcessStudentExportUseCase(
    world.studentExports,
    world.courses,
    world.students,
    storage,
  );
  getExport = new GetStudentExportUseCase(
    world.studentExports,
    world.courses,
    storage,
  );
});

const as = (caller: typeof world.owner, exportId: StudentExport.Id) => ({
  callerId: caller.id,
  callerRole: caller.role,
  exportId,
});

describe('GetStudentExportUseCase', () => {
  it('should show a pending export without a link, then a ready one with it', async () => {
    const { id } = await requestExport.execute(world.as(world.owner));

    const pending = await getExport.execute(as(world.owner, id));

    expect(pending).toMatchObject({ id, status: 'PENDING' });
    expect(pending.downloadUrl).toBeUndefined();

    await processExport.execute({ exportId: id });
    const ready = await getExport.execute(as(world.admin, id));

    expect(ready).toMatchObject({
      status: 'READY',
      rowCount: 0,
      expiresIn: 300,
    });
    expect(ready.downloadUrl).toContain(`exports/${world.course.id}/${id}.csv`);
    expect(ready.downloadUrl).toContain(`students-${world.course.id}-`);
  });

  it('should hide the export from another instructor, an unknown id and a gone course', async () => {
    const { id } = await requestExport.execute(world.as(world.owner));
    const unknown = StudentExport.create({
      courseId: world.course.id,
      requestedBy: world.owner.id,
    }).id;

    await expect(getExport.execute(as(world.other, id))).rejects.toBeInstanceOf(
      ExportNotFound,
    );
    await expect(
      getExport.execute(as(world.owner, unknown)),
    ).rejects.toBeInstanceOf(ExportNotFound);

    await world.courses.markDeleting(world.course.id);

    await expect(getExport.execute(as(world.owner, id))).rejects.toBeInstanceOf(
      ExportNotFound,
    );
  });
});
