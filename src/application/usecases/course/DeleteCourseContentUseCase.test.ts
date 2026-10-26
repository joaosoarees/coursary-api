import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FakeFileStorage } from '@tests/fakes/FakeFileStorage';
import { courseWorld } from '@tests/support/courseWorld';

import type { Course } from '@application/entities/course/Course';
import { File } from '@application/entities/file/File';
import { DeleteCourseContentUseCase } from '@application/usecases/course/DeleteCourseContentUseCase';

let world: Awaited<ReturnType<typeof courseWorld>>;
let queued: Course.Id[];
let storage: FakeFileStorage;
let deleteContent: DeleteCourseContentUseCase;

beforeEach(async () => {
  world = await courseWorld();
  queued = [];
  storage = new FakeFileStorage();
  deleteContent = new DeleteCourseContentUseCase(
    world.courseDeletion,
    {
      enqueue: (courseIds) => {
        queued.push(...courseIds);

        return Promise.resolve();
      },
    },
    storage,
  );
});

describe('DeleteCourseContentUseCase', () => {
  it('should queue the next page while there is content, then finish', async () => {
    await world.addModule('M1', 0);
    await world.courses.markDeleting(world.course.id);
    const courseId = world.course.id;

    await expect(deleteContent.execute({ courseId })).resolves.toBe('more');
    expect(queued).toEqual([courseId]);

    await expect(deleteContent.execute({ courseId })).resolves.toBe('done');
    expect(queued).toEqual([courseId]);
  });

  it("should delete the lessons' objects and then the course's, both buckets", async () => {
    const module = await world.addModule('M1', 0);
    const lesson = await world.addLesson(module, 0);
    const material = File.create({
      ownerId: lesson.id,
      purpose: 'attachment',
      contentType: 'application/pdf',
      name: 'Slides.pdf',
    });
    await world.files.create(material);
    const cover = File.create({
      ownerId: world.course.id,
      purpose: 'cover',
      contentType: 'image/png',
    });
    const original = { bytes: new Uint8Array(1), eTag: 'e' };
    storage.originals.set(material.originalKey, original);
    storage.originals.set(cover.originalKey, original);
    await storage.putPublic({
      key: File.variantKeyOf(cover, '480', original.bytes),
      bytes: original.bytes,
      contentType: 'image/webp',
    });
    await world.courses.markDeleting(world.course.id);
    const courseId = world.course.id;

    await expect(deleteContent.execute({ courseId })).resolves.toBe('more');

    expect([...storage.originals.keys()]).toEqual([cover.originalKey]);
    expect(storage.publicAssets.size).toBe(1);

    await expect(deleteContent.execute({ courseId })).resolves.toBe('done');

    expect(storage.originals.size).toBe(0);
    expect(storage.publicAssets.size).toBe(0);
    await expect(
      world.files.listByOwner(
        { ownerType: 'lesson', ownerId: lesson.id },
        'attachment',
      ),
    ).resolves.toEqual([]);
  });

  it('should refuse a live course, queue nothing and log it', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    await expect(
      deleteContent.execute({ courseId: world.course.id }),
    ).resolves.toBe('not-deleting');
    expect(queued).toEqual([]);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('CourseDeletionRefused'),
    );
  });
});
