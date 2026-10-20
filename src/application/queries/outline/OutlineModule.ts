import type { Module } from '@application/entities/outline/Module';
import type { OutlineLesson } from '@application/queries/outline/OutlineLesson';

export class OutlineModule {
  readonly id: string;
  readonly title: string;
  readonly position: number;
  readonly lessons: OutlineLesson[];

  constructor(attributes: OutlineModule) {
    this.id = attributes.id;
    this.title = attributes.title;
    this.position = attributes.position;
    this.lessons = attributes.lessons;
  }

  static fromModule(module: Module, lessons: OutlineLesson[]): OutlineModule {
    return new OutlineModule({
      id: module.id,
      title: module.title,
      position: module.position,
      lessons,
    });
  }
}
