import KSUID from 'ksuid';

import type { Course } from '@application/entities/course/Course';
import type { Module } from '@application/entities/outline/Module';
import { KSUID_PATTERN } from '@application/entities/shared/ksuid';

export class Lesson {
  readonly id: Lesson.Id;
  readonly courseId: Course.Id;
  moduleId: Module.Id;
  title: string;
  body: string;
  durationMinutes: number;
  position: number;

  constructor(attributes: Lesson.Attributes) {
    this.id = attributes.id;
    this.courseId = attributes.courseId;
    this.moduleId = attributes.moduleId;
    this.title = attributes.title;
    this.body = attributes.body;
    this.durationMinutes = attributes.durationMinutes;
    this.position = attributes.position;
  }

  static isId(value: unknown): value is Lesson.Id {
    return typeof value === 'string' && KSUID_PATTERN.test(value);
  }

  static toId(value: string): Lesson.Id {
    if (!Lesson.isId(value)) {
      throw new TypeError(`Not a lesson id: ${JSON.stringify(value)}`);
    }

    return value;
  }

  static create({
    courseId,
    moduleId,
    title,
    body,
    durationMinutes,
    position,
  }: {
    courseId: Course.Id;
    moduleId: Module.Id;
    title: string;
    body: string;
    durationMinutes: number;
    position: number;
  }): Lesson {
    return new Lesson({
      id: Lesson.toId(KSUID.randomSync().string),
      courseId,
      moduleId,
      title: title.trim(),
      body,
      durationMinutes,
      position,
    });
  }
}

export namespace Lesson {
  export type Id = string & { readonly __brand: 'Lesson.Id' };

  export interface Attributes {
    id: Id;
    courseId: Course.Id;
    moduleId: Module.Id;
    title: string;
    body: string;
    durationMinutes: number;
    position: number;
  }

  export interface Changes {
    title?: string;
    body?: string;
    durationMinutes?: number;
  }

  // A lesson without its body, as the outline reads it (Q72, Q337).
  export type Summary = Pick<
    Lesson,
    'id' | 'moduleId' | 'title' | 'durationMinutes' | 'position'
  >;
}
