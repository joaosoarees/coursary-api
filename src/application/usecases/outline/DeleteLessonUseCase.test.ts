import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FakeFileStorage } from '@tests/fakes/FakeFileStorage';
import { courseWorld } from '@tests/support/courseWorld';

import { File } from '@application/entities/file/File';
import { CoursePublished } from '@application/errors/course';
import { LessonNotFound } from '@application/errors/outline';
import { DeleteLessonUseCase } from '@application/usecases/outline/DeleteLessonUseCase';

let world: Awaited<ReturnType<typeof courseWorld>>;
let storage: FakeFileStorage;
let remove: DeleteLessonUseCase;

beforeEach(async () => {
  world = await courseWorld();
  storage = new FakeFileStorage();
  remove = new DeleteLessonUseCase(
    world.courses,
    world.modules,
    world.lessons,
    world.unitOfWork,
    storage,
    world.files,
  );
});

const addMaterial = async (lessonId: string) => {
  const file = File.create({
    ownerId: lessonId,
    purpose: 'attachment',
    contentType: 'application/pdf',
    name: 'Slides.pdf',
  });
  await world.files.create(file);
  storage.originals.set(file.originalKey, {
    bytes: new Uint8Array(1),
    eTag: 'e',
  });

  return file;
};

const materialOf = (lessonId: string) =>
  world.files.listByOwner(
    { ownerType: 'lesson', ownerId: lessonId },
    'attachment',
  );

describe('DeleteLessonUseCase', () => {
  it('should delete a lesson of a draft and take it off the count', async () => {
    const module = await world.addModule('M1', 0);
    const lesson = await world.addLesson(module, 0);
    const input = {
      ...world.as(world.owner),
      moduleId: module.id,
      lessonId: lesson.id,
    };

    await remove.execute(input);

    expect((await world.storedCourse())?.lessonCount).toBe(0);
    await expect(remove.execute(input)).rejects.toBeInstanceOf(LessonNotFound);
  });

  it('should keep the lessons of a published course', async () => {
    const module = await world.addModule('M1', 0);
    const lesson = await world.addLesson(module, 0);
    await world.setCourse({ status: 'PUBLISHED' });

    await expect(
      remove.execute({
        ...world.as(world.owner),
        moduleId: module.id,
        lessonId: lesson.id,
      }),
    ).rejects.toBeInstanceOf(CoursePublished);
  });

  it('should take the material along, the objects and the records', async () => {
    const module = await world.addModule('M1', 0);
    const lesson = await world.addLesson(module, 0);
    const kept = await world.addLesson(module, 1);
    await addMaterial(lesson.id);
    const other = await addMaterial(kept.id);

    await remove.execute({
      ...world.as(world.owner),
      moduleId: module.id,
      lessonId: lesson.id,
    });

    await expect(materialOf(lesson.id)).resolves.toEqual([]);
    expect([...storage.originals.keys()]).toEqual([other.originalKey]);
    await expect(materialOf(kept.id)).resolves.toHaveLength(1);
  });

  it('should still delete the lesson when its material cannot go, and log it', async () => {
    const error = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    vi.spyOn(storage, 'deleteOwnerFiles').mockRejectedValue(new Error('S3'));
    const module = await world.addModule('M1', 0);
    const lesson = await world.addLesson(module, 0);
    await addMaterial(lesson.id);

    await remove.execute({
      ...world.as(world.owner),
      moduleId: module.id,
      lessonId: lesson.id,
    });

    expect((await world.storedCourse())?.lessonCount).toBe(0);
    await expect(materialOf(lesson.id)).resolves.toEqual([]);
    expect(storage.originals.size).toBe(1);
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining('LessonMaterialLeft'),
    );
  });
});
