import KSUID from 'ksuid';

import type { Course } from '@application/entities/course/Course';
import { KSUID_PATTERN } from '@application/entities/shared/ksuid';

export class Module {
  readonly id: Module.Id;
  readonly courseId: Course.Id;
  title: string;
  position: number;
  // Held by the lesson writes, so an empty module can be deleted safely (Q288).
  lessonCount: number;

  constructor(attributes: Module.Attributes) {
    this.id = attributes.id;
    this.courseId = attributes.courseId;
    this.title = attributes.title;
    this.position = attributes.position;
    this.lessonCount = attributes.lessonCount;
  }

  static isId(value: unknown): value is Module.Id {
    return typeof value === 'string' && KSUID_PATTERN.test(value);
  }

  static toId(value: string): Module.Id {
    if (!Module.isId(value)) {
      throw new TypeError(`Not a module id: ${JSON.stringify(value)}`);
    }

    return value;
  }

  static create({
    courseId,
    title,
    position,
  }: {
    courseId: Course.Id;
    title: string;
    position: number;
  }): Module {
    return new Module({
      id: Module.toId(KSUID.randomSync().string),
      courseId,
      title: title.trim(),
      position,
      lessonCount: 0,
    });
  }
}

export namespace Module {
  export type Id = string & { readonly __brand: 'Module.Id' };

  export interface Attributes {
    id: Id;
    courseId: Course.Id;
    title: string;
    position: number;
    lessonCount: number;
  }
}
