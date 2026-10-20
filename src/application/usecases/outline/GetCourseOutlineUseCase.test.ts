import { beforeEach, describe, expect, it } from 'vitest';

import { uniqueEmail } from '@tests/support/accountWorld';
import { courseWorld } from '@tests/support/courseWorld';

import { Account } from '@application/entities/account/Account';
import { Enrollment } from '@application/entities/enrollment/Enrollment';
import { Forbidden } from '@application/errors/common';
import { CourseNotFound } from '@application/errors/course';
import { GetCourseOutlineUseCase } from '@application/usecases/outline/GetCourseOutlineUseCase';

let world: Awaited<ReturnType<typeof courseWorld>>;
let getOutline: GetCourseOutlineUseCase;

const outlineFor = (caller: Account) => getOutline.execute(world.as(caller));

beforeEach(async () => {
  world = await courseWorld();
  getOutline = new GetCourseOutlineUseCase(
    world.courses,
    world.enrollments,
    world.outline,
  );
  await world.addModule('M1', 0);
});

describe('GetCourseOutlineUseCase', () => {
  it('should hide the outline of a draft from another instructor', async () => {
    await expect(outlineFor(world.other)).rejects.toBeInstanceOf(
      CourseNotFound,
    );
  });

  it('should show the owner and an admin the outline of an archived course', async () => {
    await world.setCourse({ status: 'ARCHIVED' });

    await expect(outlineFor(world.owner)).resolves.toMatchObject({
      modules: [{ title: 'M1' }],
    });
    await expect(outlineFor(world.admin)).resolves.toMatchObject({
      modules: [{ title: 'M1' }],
    });
  });

  it('should show an enrolled student the outline of an archived course, and refuse anyone else', async () => {
    const student = Account.create({
      name: 'Duda',
      email: uniqueEmail('duda'),
    });
    await world.setCourse({ status: 'PUBLISHED' });
    await expect(outlineFor(student)).rejects.toBeInstanceOf(Forbidden);

    const unit = world.unitOfWork();
    unit.add(
      world.enrollments.createOperation(
        Enrollment.create({ student, course: world.course }),
      ),
    );
    await unit.commit();
    await world.setCourse({ status: 'ARCHIVED' });

    await expect(outlineFor(student)).resolves.toMatchObject({
      modules: [{ title: 'M1' }],
    });
  });
});
