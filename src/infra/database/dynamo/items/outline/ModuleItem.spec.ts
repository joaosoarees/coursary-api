import { describe, expect, it } from 'vitest';

import { anAccountId } from '@tests/support/ids';

import { Course } from '@application/entities/course/Course';
import { Module } from '@application/entities/outline/Module';
import { ModuleItem } from '@infra/database/dynamo/items/outline/ModuleItem';

describe('ModuleItem', () => {
  it('should keep the module in the course partition', () => {
    const courseId = Course.toId(anAccountId());
    const module = Module.create({ courseId, title: ' Intro ', position: 0 });

    expect(ModuleItem.fromEntity(module).toItem()).toMatchObject({
      PK: `COURSE#${courseId}`,
      SK: `MODULE#${module.id}`,
      title: 'Intro',
      type: 'Module',
    });
  });
});
