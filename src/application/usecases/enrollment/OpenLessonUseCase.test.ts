import { beforeEach, describe, expect, it } from 'vitest';

import { FakeFileStorage } from '@tests/fakes/FakeFileStorage';
import { uniqueEmail } from '@tests/support/accountWorld';
import { courseWorld } from '@tests/support/courseWorld';

import { Account } from '@application/entities/account/Account';
import { Enrollment } from '@application/entities/enrollment/Enrollment';
import { File } from '@application/entities/file/File';
import type { Lesson } from '@application/entities/outline/Lesson';
import { Forbidden } from '@application/errors/common';
import { CourseNotFound } from '@application/errors/course';
import { LessonNotFound } from '@application/errors/outline';
import { OpenLessonUseCase } from '@application/usecases/enrollment/OpenLessonUseCase';

let world: Awaited<ReturnType<typeof courseWorld>>;
let openLesson: OpenLessonUseCase;
let lesson: Lesson;
let student: Account;

const enrollStudent = async () => {
  const enrollment = Enrollment.create({ student, course: world.course });
  const unit = world.unitOfWork();
  unit.add(world.enrollments.createOperation(enrollment));
  await unit.commit();

  return enrollment;
};

const open = (caller: Account, lessonId = lesson.id) =>
  openLesson.execute({ ...world.as(caller), lessonId });

beforeEach(async () => {
  world = await courseWorld();
  openLesson = new OpenLessonUseCase(
    world.courses,
    world.enrollments,
    world.lessons,
    new FakeFileStorage(),
  );
  const module = await world.addModule('M1', 0);
  lesson = await world.addLesson(module, 0);
  student = Account.create({ name: 'Duda', email: uniqueEmail('duda') });
  await world.setCourse({ status: 'PUBLISHED' });
});

describe('OpenLessonUseCase', () => {
  it('should open the lesson to an enrolled student, also once archived', async () => {
    await enrollStudent();

    await expect(open(student)).resolves.toEqual({
      lessonId: lesson.id,
      courseId: world.course.id,
      body: '',
      attachments: [],
    });

    await world.setCourse({ status: 'ARCHIVED' });
    await expect(open(student)).resolves.toMatchObject({ lessonId: lesson.id });
  });

  it('should list only the sent material, in order', async () => {
    await enrollStudent();
    const material = (name: string, position: number) =>
      File.create({
        ownerId: lesson.id,
        purpose: 'attachment',
        contentType: 'application/pdf',
        name,
        position,
      });
    const second = material('B.pdf', 1);
    const first = material('A.pdf', 0);
    const pending = material('C.pdf', 2);
    for (const file of [second, first]) {
      await world.files.create(file);
      file.markUploaded(5);
      await world.files.markUploaded(file);
    }
    await world.files.create(pending);

    const opened = await open(student);

    expect(opened.attachments.map((item) => item.name)).toEqual([
      'A.pdf',
      'B.pdf',
    ]);
  });

  it('should hand the current video to whoever may open the lesson, apart from the material', async () => {
    await enrollStudent();
    const video = (status: 'sent' | 'pending') => {
      const file = File.create({
        ownerId: lesson.id,
        purpose: 'video',
        contentType: 'video/mp4',
        size: 10,
      });

      if (status === 'sent') {
        file.markUploaded(10);
      }

      return file;
    };
    const [older, newer] = [video('sent'), video('sent')].sort((a, b) =>
      a.id < b.id ? -1 : 1,
    ) as [File, File];
    for (const file of [older, newer, video('pending')]) {
      await world.files.create(file);
      await world.files.markUploaded(file);
    }

    const opened = await open(student);

    expect(opened.attachments).toEqual([]);
    expect(opened.video).toEqual({
      url: expect.stringContaining(newer.originalKey) as string,
      expiresIn: 7200,
    });
    expect((await open(world.owner)).video?.url).toContain(newer.originalKey);
  });

  it('should leave the video out of a lesson that has none sent', async () => {
    await enrollStudent();

    const opened = await open(student);

    expect(opened.video).toBeUndefined();
    expect(JSON.parse(JSON.stringify(opened))).not.toHaveProperty('video');
  });

  it('should refuse a student who left the course', async () => {
    const enrollment = await enrollStudent();
    const unit = world.unitOfWork();
    unit.add(world.enrollments.cancelOperation(enrollment));
    await unit.commit();

    await expect(open(student)).rejects.toBeInstanceOf(Forbidden);
  });

  it('should refuse anyone else: 403 on a visible course, 404 on a draft', async () => {
    await expect(open(student)).rejects.toBeInstanceOf(Forbidden);
    await expect(open(world.other)).rejects.toBeInstanceOf(Forbidden);

    await world.setCourse({ status: 'DRAFT' });
    await expect(open(world.other)).rejects.toBeInstanceOf(CourseNotFound);
  });

  it('should open any lesson to the owner and an admin, whatever the status', async () => {
    await world.setCourse({ status: 'DRAFT' });
    await expect(open(world.owner)).resolves.toMatchObject({ body: '' });

    await world.setCourse({ status: 'ARCHIVED' });
    await expect(open(world.admin)).resolves.toMatchObject({ body: '' });
  });

  it('should answer not found for a lesson of another course', async () => {
    const other = await courseWorld();
    const otherLesson = await other.addLesson(await other.addModule('M', 0), 0);

    await expect(open(world.owner, otherLesson.id)).rejects.toBeInstanceOf(
      LessonNotFound,
    );
  });
});
