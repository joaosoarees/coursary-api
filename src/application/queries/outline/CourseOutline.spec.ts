import { describe, expect, it } from 'vitest';

import { anAccountId } from '@tests/support/ids';

import { Course } from '@application/entities/course/Course';
import type { Lesson } from '@application/entities/outline/Lesson';
import { Module } from '@application/entities/outline/Module';
import { CourseOutline } from '@application/queries/outline/CourseOutline';

const courseId = Course.toId(anAccountId());

const module = (id: string, position: number) =>
  new Module({
    id: Module.toId(id.padEnd(27, '0')),
    courseId,
    title: `M${id}`,
    position,
    lessonCount: 0,
  });

const lesson = (
  id: string,
  moduleId: Module.Id,
  position: number,
): Lesson.Summary => ({
  id: id.padEnd(27, '0') as Lesson.Id,
  moduleId,
  title: `L${id}`,
  durationMinutes: 5,
  position,
});

describe('CourseOutline', () => {
  it('should group lessons under their modules, by position and then by id', () => {
    const first = module('A', 0);
    const second = module('B', 1);

    const outline = CourseOutline.from(
      [second, first],
      [
        lesson('L3', second.id, 0),
        lesson('L2', first.id, 1),
        lesson('L9', first.id, 0),
        lesson('L1', first.id, 0),
      ],
    );

    expect(
      outline.modules.map((m) => [m.title, m.lessons.map((l) => l.title)]),
    ).toEqual([
      ['MA', ['LL1', 'LL9', 'LL2']],
      ['MB', ['LL3']],
    ]);
  });

  it('should leave out a lesson whose module is not there, and show only summary fields', () => {
    const only = module('A', 0);
    const orphanModule = module('Z', 9).id;

    const outline = CourseOutline.from(
      [only],
      [lesson('L1', only.id, 0), lesson('L2', orphanModule, 0)],
    );

    expect(JSON.parse(JSON.stringify(outline))).toEqual({
      modules: [
        {
          id: only.id,
          title: 'MA',
          position: 0,
          lessons: [
            {
              id: 'L1'.padEnd(27, '0'),
              title: 'LL1',
              durationMinutes: 5,
              position: 0,
            },
          ],
        },
      ],
    });
  });
});
