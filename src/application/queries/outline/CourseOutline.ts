import type { Lesson } from '@application/entities/outline/Lesson';
import type { Module } from '@application/entities/outline/Module';
import { OutlineLesson } from '@application/queries/outline/OutlineLesson';
import { OutlineModule } from '@application/queries/outline/OutlineModule';

interface Positioned {
  id: string;
  position: number;
}

export class CourseOutline {
  readonly modules: OutlineModule[];

  constructor(attributes: CourseOutline) {
    this.modules = attributes.modules;
  }

  // Groups the lessons under their modules, in order: position, then the id
  // breaks a tie left by two creations at once (pattern 6, Q225).
  static from(modules: Module[], lessons: Lesson.Summary[]): CourseOutline {
    const byPosition = (a: Positioned, b: Positioned) =>
      a.position - b.position || a.id.localeCompare(b.id);

    const lessonsByModule = new Map<string, Lesson.Summary[]>();

    for (const lesson of lessons) {
      const group = lessonsByModule.get(lesson.moduleId) ?? [];
      group.push(lesson);
      lessonsByModule.set(lesson.moduleId, group);
    }

    // A lesson whose module is not there is left out.
    return new CourseOutline({
      modules: [...modules].sort(byPosition).map((module) =>
        OutlineModule.fromModule(
          module,
          (lessonsByModule.get(module.id) ?? [])
            .sort(byPosition)
            .map((lesson) => OutlineLesson.fromSummary(lesson)),
        ),
      ),
    });
  }
}
