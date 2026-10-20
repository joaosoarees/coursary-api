import { describe, expect, it } from 'vitest';

import { Account } from '@application/entities/account/Account';
import { Course } from '@application/entities/course/Course';
import { InvalidCursor } from '@application/errors/common';
import { DynamoListCoursesByInstructorQuery } from '@infra/database/dynamo/queries/course/DynamoListCoursesByInstructorQuery';
import { DynamoCourseRepository } from '@infra/database/dynamo/repositories/course/DynamoCourseRepository';
import { AppConfig } from '@shared/config/AppConfig';

const config = new AppConfig();
const courses = new DynamoCourseRepository(config);
const query = new DynamoListCoursesByInstructorQuery(config);

const instructorWith = async (count: number) => {
  const instructor = Account.create({ name: 'Ana', email: 'a@example.com' });

  for (let i = 0; i < count; i++) {
    await courses.create(Course.create({ instructor, title: `C${String(i)}` }));
  }

  return instructor;
};

describe('DynamoListCoursesByInstructorQuery', () => {
  it('should list only the courses of the instructor, newest first, across pages', async () => {
    const ana = await instructorWith(3);
    await instructorWith(2);
    const ids: string[] = [];
    let cursor: string | undefined;

    do {
      const page = await query.execute({
        instructorId: ana.id,
        page: { limit: 2, cursor },
      });
      ids.push(...page.items.map((item) => item.id));
      cursor = page.nextCursor ?? undefined;
    } while (cursor);

    expect(ids).toHaveLength(3);
    expect(ids).toEqual([...ids].sort().reverse());
  });

  it('should refuse a cursor from another instructor', async () => {
    const ana = await instructorWith(2);
    const bia = await instructorWith(2);
    const { nextCursor } = await query.execute({
      instructorId: ana.id,
      page: { limit: 1 },
    });

    await expect(
      query.execute({
        instructorId: bia.id,
        page: { limit: 1, cursor: nextCursor ?? undefined },
      }),
    ).rejects.toBeInstanceOf(InvalidCursor);
  });
});
