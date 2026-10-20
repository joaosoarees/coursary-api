import KSUID from 'ksuid';
import { describe, expect, it } from 'vitest';

import { Account } from '@application/entities/account/Account';
import { Course } from '@application/entities/course/Course';
import { Enrollment } from '@application/entities/enrollment/Enrollment';
import { LessonProgress } from '@application/entities/enrollment/LessonProgress';
import { Lesson } from '@application/entities/outline/Lesson';
import { LessonProgressItem } from '@infra/database/dynamo/items/enrollment/LessonProgressItem';

const student = Account.create({ name: 'Bia', email: 'bia@example.com' });
const course = Course.create({
  instructor: student,
  title: 'T',
});
const enrollment = Enrollment.create({ student, course });
const lessonId = Lesson.toId(KSUID.randomSync().string);

describe('LessonProgressItem', () => {
  it('should sort the lesson under its course prefix in the student partition', () => {
    const progress = LessonProgress.create({ enrollment, lessonId });

    expect(LessonProgressItem.fromEntity(progress).toItem()).toMatchObject({
      PK: `ACCOUNT#${student.id}`,
      SK: `PROGRESS#${course.id}#LESSON#${lessonId}`,
      type: 'LessonProgress',
    });
  });

  it('should come back as the same progress', () => {
    const progress = LessonProgress.create({ enrollment, lessonId });

    expect(
      LessonProgressItem.toEntity(
        LessonProgressItem.fromEntity(progress).toItem(),
      ),
    ).toEqual(progress);
  });
});
