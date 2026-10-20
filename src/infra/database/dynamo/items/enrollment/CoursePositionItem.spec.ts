import KSUID from 'ksuid';
import { describe, expect, it } from 'vitest';

import { Account } from '@application/entities/account/Account';
import { Course } from '@application/entities/course/Course';
import { CoursePosition } from '@application/entities/enrollment/CoursePosition';
import { Lesson } from '@application/entities/outline/Lesson';
import { CoursePositionItem } from '@infra/database/dynamo/items/enrollment/CoursePositionItem';

const student = Account.create({ name: 'Bia', email: 'bia@example.com' });
const courseId = Course.toId(KSUID.randomSync().string);
const position = CoursePosition.create({
  accountId: student.id,
  courseId,
  lessonId: Lesson.toId(KSUID.randomSync().string),
  positionSeconds: 42,
});

describe('CoursePositionItem', () => {
  it('should hold one position per course, ahead of its completed lessons', () => {
    expect(CoursePositionItem.fromEntity(position).toItem()).toMatchObject({
      PK: `ACCOUNT#${student.id}`,
      SK: `PROGRESS#${courseId}`,
      positionSeconds: 42,
      type: 'CoursePosition',
    });
  });

  it('should come back as the same position', () => {
    expect(
      CoursePositionItem.toEntity(
        CoursePositionItem.fromEntity(position).toItem(),
      ),
    ).toEqual(position);
  });
});
