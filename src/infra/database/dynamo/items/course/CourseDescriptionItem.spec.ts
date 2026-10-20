import { describe, expect, it } from 'vitest';

import { anAccountId } from '@tests/support/ids';

import { Course } from '@application/entities/course/Course';
import { CourseDescriptionItem } from '@infra/database/dynamo/items/course/CourseDescriptionItem';

describe('CourseDescriptionItem', () => {
  it('should keep the description in the course partition', () => {
    const courseId = Course.toId(anAccountId());

    const item = new CourseDescriptionItem({
      courseId,
      description: 'Keys and indexes',
    }).toItem();

    expect(item).toEqual({
      PK: `COURSE#${courseId}`,
      SK: 'DESCRIPTION',
      courseId,
      description: 'Keys and indexes',
      type: 'CourseDescription',
    });
    expect(CourseDescriptionItem.toDescription(item)).toBe('Keys and indexes');
  });

  it('should read a missing item as an empty description', () => {
    expect(CourseDescriptionItem.toDescription(undefined)).toBe('');
  });
});
