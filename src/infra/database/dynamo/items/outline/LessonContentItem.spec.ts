import { describe, expect, it } from 'vitest';

import { anAccountId } from '@tests/support/ids';

import { Course } from '@application/entities/course/Course';
import { Lesson } from '@application/entities/outline/Lesson';
import { Module } from '@application/entities/outline/Module';
import { LessonContentItem } from '@infra/database/dynamo/items/outline/LessonContentItem';

describe('LessonContentItem', () => {
  it('should keep the body in the lesson partition', () => {
    const lesson = Lesson.create({
      courseId: Course.toId(anAccountId()),
      moduleId: Module.toId(anAccountId()),
      title: 'Keys',
      body: '# Keys',
      durationMinutes: 10,
      position: 0,
    });

    expect(LessonContentItem.fromEntity(lesson).toItem()).toMatchObject({
      PK: `LESSON#${lesson.id}`,
      SK: 'CONTENT',
      body: '# Keys',
      type: 'LessonContent',
    });
  });
});
