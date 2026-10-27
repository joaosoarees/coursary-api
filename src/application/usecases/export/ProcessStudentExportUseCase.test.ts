import { beforeEach, describe, expect, it } from 'vitest';

import { FakeFileStorage } from '@tests/fakes/FakeFileStorage';
import { uniqueEmail } from '@tests/support/accountWorld';
import { courseWorld } from '@tests/support/courseWorld';

import { Account } from '@application/entities/account/Account';
import { Enrollment } from '@application/entities/enrollment/Enrollment';
import { ProcessStudentExportUseCase } from '@application/usecases/export/ProcessStudentExportUseCase';
import { RequestStudentExportUseCase } from '@application/usecases/export/RequestStudentExportUseCase';

let world: Awaited<ReturnType<typeof courseWorld>>;
let storage: FakeFileStorage;
let requestExport: RequestStudentExportUseCase;
let processExport: ProcessStudentExportUseCase;

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
});

const enroll = async (name: string, completedLessons: number) => {
  const student = Account.create({ name, email: uniqueEmail(name) });
  const enrollment = new Enrollment({
    accountId: student.id,
    courseId: world.course.id,
    status: 'ACTIVE',
    studentName: name,
    enrolledAt: new Date('2026-10-27T12:00:00.000Z'),
    completedLessons,
  });
  const unit = world.unitOfWork();
  unit.add(world.enrollments.createOperation(enrollment));
  await unit.commit();

  return enrollment;
};

describe('ProcessStudentExportUseCase', () => {
  it('should write every active student once, finish the export and free the course', async () => {
    const module = await world.addModule('M1', 0);
    await world.addLesson(module, 0);
    await world.addLesson(module, 1);
    await enroll('Ana', 1);
    await enroll('Bia', 2);
    const cancelled = await enroll('Caio', 0);
    const unit = world.unitOfWork();
    unit.add(world.enrollments.cancelOperation(cancelled));
    await unit.commit();
    const { id } = await requestExport.execute(world.as(world.owner));

    await expect(processExport.execute({ exportId: id })).resolves.toBe(
      'ready',
    );

    const stored = await world.studentExports.find(id);
    expect(stored).toMatchObject({ status: 'READY', rowCount: 2 });
    const lines = (storage.exports.get(stored?.fileKey ?? '') ?? '')
      .replace(/^\uFEFF/, '')
      .split('\r\n');
    expect(lines[0]).toBe('name,enrolledAt,completedLessons,progress');
    expect(lines.slice(1, 3).sort()).toEqual([
      'Ana,2026-10-27T12:00:00.000Z,1,50',
      'Bia,2026-10-27T12:00:00.000Z,2,100',
    ]);
    await expect(processExport.execute({ exportId: id })).resolves.toBe(
      'skipped',
    );
    await expect(
      requestExport.execute(world.as(world.owner)),
    ).resolves.toMatchObject({ status: 'PENDING' });
  });

  it('should fail an export whose course is gone', async () => {
    const { id } = await requestExport.execute(world.as(world.owner));
    await world.courses.markDeleting(world.course.id);

    await expect(processExport.execute({ exportId: id })).resolves.toBe(
      'failed',
    );
    await expect(world.studentExports.find(id)).resolves.toMatchObject({
      status: 'FAILED',
    });
    expect(storage.exports.size).toBe(0);
  });
});
