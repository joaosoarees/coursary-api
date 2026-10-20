import { describe, expect, it } from 'vitest';

import { anAccountId } from '@tests/support/ids';

import { Course } from '@application/entities/course/Course';
import { Lesson } from '@application/entities/outline/Lesson';
import { Module } from '@application/entities/outline/Module';
import { LessonItem } from '@infra/database/dynamo/items/outline/LessonItem';

describe('LessonItem', () => {
  it('should keep the lesson summary in the course partition, without the body', () => {
    const courseId = Course.toId(anAccountId());
    const moduleId = Module.toId(anAccountId());
    const lesson = Lesson.create({
      courseId,
      moduleId,
      title: 'Keys',
      body: '# Keys',
      durationMinutes: 10,
      position: 0,
    });

    const item = LessonItem.fromEntity(lesson).toItem();

    expect(item).toMatchObject({
      PK: `COURSE#${courseId}`,
      SK: `MODULE#${moduleId}#LESSON#${lesson.id}`,
      type: 'Lesson',
    });
    expect(item).not.toHaveProperty('body');
    expect(LessonItem.toSummary(item)).toEqual({
      id: lesson.id,
      moduleId,
      title: 'Keys',
      durationMinutes: 10,
      position: 0,
    });
  });
});
