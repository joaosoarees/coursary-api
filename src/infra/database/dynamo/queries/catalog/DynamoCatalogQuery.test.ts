import { describe, expect, it } from 'vitest';

import { Account } from '@application/entities/account/Account';
import { Course } from '@application/entities/course/Course';
import { Lesson } from '@application/entities/outline/Lesson';
import { Module } from '@application/entities/outline/Module';
import { DynamoUnitOfWork } from '@infra/database/dynamo/DynamoUnitOfWork';
import { DynamoCatalogQuery } from '@infra/database/dynamo/queries/catalog/DynamoCatalogQuery';
import { DynamoCourseRepository } from '@infra/database/dynamo/repositories/course/DynamoCourseRepository';
import { DynamoLessonRepository } from '@infra/database/dynamo/repositories/outline/DynamoLessonRepository';
import { DynamoModuleRepository } from '@infra/database/dynamo/repositories/outline/DynamoModuleRepository';
import { AppConfig } from '@shared/config/AppConfig';

const config = new AppConfig();
const courses = new DynamoCourseRepository(config);
const modules = new DynamoModuleRepository(config);
const lessons = new DynamoLessonRepository(config);
const catalog = new DynamoCatalogQuery(config);
const instructor = Account.create({ name: 'Ana', email: 'ana@example.com' });

const courseWithLesson = async (title: string) => {
  const course = Course.create({ instructor, title });
  await courses.create(course);
  const module = Module.create({
    courseId: course.id,
    title: 'M1',
    position: 0,
  });
  const lesson = Lesson.create({
    courseId: course.id,
    moduleId: module.id,
    title: 'L1',
    body: '# Secret body',
    durationMinutes: 5,
    position: 0,
  });
  const unit = new DynamoUnitOfWork();
  unit.add(
    modules.createOperation(module),
    ...lessons.createOperations(lesson),
    courses.addLessonsOperation(course, 1),
  );
  await unit.commit();

  return { course, module, lesson };
};

const readCatalog = async () => {
  const ids: string[] = [];
  let cursor: string | undefined;

  do {
    const page = await catalog.execute({ limit: 2, cursor });
    ids.push(...page.items.map((item) => item.id));
    cursor = page.nextCursor ?? undefined;
  } while (cursor);

  return ids;
};

describe('DynamoCatalogQuery', () => {
  it('should list published courses in the catalog, newest first, and nothing else', async () => {
    const draft = await courseWithLesson('Draft');
    const older = await courseWithLesson('Older');
    const newer = await courseWithLesson('Newer');
    const archived = await courseWithLesson('Archived');
    await courses.publish(older.course.id, new Date('2026-01-01T00:00:00Z'));
    await courses.publish(newer.course.id, new Date('2026-02-01T00:00:00Z'));
    await courses.publish(archived.course.id, new Date('2026-03-01T00:00:00Z'));
    await courses.archive(archived.course.id);

    const ids = await readCatalog();

    expect(ids).not.toContain(draft.course.id);
    expect(ids).not.toContain(archived.course.id);
    expect(ids.indexOf(newer.course.id)).toBeLessThan(
      ids.indexOf(older.course.id),
    );
  });
});
