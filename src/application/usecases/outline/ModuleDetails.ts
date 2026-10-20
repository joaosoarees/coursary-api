import type { Module } from '@application/entities/outline/Module';

export class ModuleDetails {
  readonly id: string;
  readonly title: string;
  readonly position: number;

  constructor(attributes: ModuleDetails) {
    this.id = attributes.id;
    this.title = attributes.title;
    this.position = attributes.position;
  }

  static fromModule(module: Module): ModuleDetails {
    return new ModuleDetails({
      id: module.id,
      title: module.title,
      position: module.position,
    });
  }
}
