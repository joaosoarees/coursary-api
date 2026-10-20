import { beforeEach, describe, expect, it } from 'vitest';

import { courseWorld } from '@tests/support/courseWorld';

import { OutlineMismatch, OutlineTooLarge } from '@application/errors/outline';
import { ReorderOutlineUseCase } from '@application/usecases/outline/ReorderOutlineUseCase';

let world: Awaited<ReturnType<typeof courseWorld>>;
let reorder: ReorderOutlineUseCase;

beforeEach(async () => {
  world = await courseWorld();
  reorder = new ReorderOutlineUseCase(
    world.courses,
    world.modules,
    world.lessons,
    world.outline,
    world.unitOfWork,
  );
});

describe('ReorderOutlineUseCase', () => {
  it('should swap modules and move a lesson to another module', async () => {
    const m1 = await world.addModule('M1', 0);
    const m2 = await world.addModule('M2', 1);
    const [a, b, c] = [
      await world.addLesson(m1, 0),
      await world.addLesson(m1, 1),
      await world.addLesson(m2, 0),
    ];

    await reorder.execute({
      ...world.as(world.owner),
      modules: [
        { id: m2.id, lessonIds: [c.id, a.id] },
        { id: m1.id, lessonIds: [b.id] },
      ],
    });

    const { modules } = await world.outline.execute(world.course.id);
    expect(modules.map((m) => [m.id, m.lessons.map((l) => l.id)])).toEqual([
      [m2.id, [c.id, a.id]],
      [m1.id, [b.id]],
    ]);
    const counts = await Promise.all(
      [m1, m2].map((m) => world.modules.findById(world.course.id, m.id)),
    );
    expect(counts.map((m) => m?.lessonCount)).toEqual([1, 2]);
  });

  it('should refuse an outline that leaves out or repeats an item', async () => {
    const m1 = await world.addModule('M1', 0);
    const m2 = await world.addModule('M2', 1);
    const [a, b, c] = [
      await world.addLesson(m1, 0),
      await world.addLesson(m1, 1),
      await world.addLesson(m2, 0),
    ];
    const missing = [
      { id: m1.id, lessonIds: [a.id, b.id] },
      { id: m2.id, lessonIds: [] },
    ];
    const repeated = [
      { id: m1.id, lessonIds: [a.id, b.id, c.id] },
      { id: m2.id, lessonIds: [c.id] },
    ];

    for (const modules of [missing, repeated]) {
      await expect(
        reorder.execute({ ...world.as(world.owner), modules }),
      ).rejects.toBeInstanceOf(OutlineMismatch);
    }
  });

  it('should refuse an outline that moves more than one transaction holds', async () => {
    const m1 = await world.addModule('M1', 0);
    const m2 = await world.addModule('M2', 1);
    const fromM1 = [];

    for (let position = 0; position < 51; position++) {
      fromM1.push((await world.addLesson(m1, position)).id);
    }

    await expect(
      reorder.execute({
        ...world.as(world.owner),
        modules: [
          { id: m1.id, lessonIds: [] },
          { id: m2.id, lessonIds: fromM1 },
        ],
      }),
    ).rejects.toBeInstanceOf(OutlineTooLarge);
  });
});
