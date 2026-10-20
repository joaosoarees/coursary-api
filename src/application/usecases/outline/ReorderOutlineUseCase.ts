import type { UnitOfWork } from '@application/contracts/UnitOfWork';
import { Course } from '@application/entities/course/Course';
import { Lesson } from '@application/entities/outline/Lesson';
import { Module } from '@application/entities/outline/Module';
import { OutlineMismatch, OutlineTooLarge } from '@application/errors/outline';
import { CourseOutline } from '@application/queries/outline/CourseOutline';
import type { CourseOutlineQuery } from '@application/queries/outline/CourseOutlineQuery';
import type { CourseRepository } from '@application/repositories/course/CourseRepository';
import type { LessonRepository } from '@application/repositories/outline/LessonRepository';
import type { ModuleRepository } from '@application/repositories/outline/ModuleRepository';
import type { CourseEditor } from '@application/usecases/course/CourseEditor';

export class ReorderOutlineUseCase {
  static readonly maxOperations = 100;

  constructor(
    private readonly coursesRepository: CourseRepository,
    private readonly modulesRepository: ModuleRepository,
    private readonly lessonsRepository: LessonRepository,
    private readonly courseOutline: CourseOutlineQuery,
    private readonly unitOfWork: UnitOfWork.Factory,
  ) {}

  async execute({
    callerId,
    callerRole,
    courseId,
    modules: order,
  }: ReorderOutlineUseCase.Input): Promise<CourseOutline> {
    const found = await this.coursesRepository.findById(courseId);
    const course = Course.requireFound(found);
    course.requireEditableBy(callerId, callerRole);
    const current = await this.courseOutline.execute(courseId, {
      consistent: true,
    });
    ReorderOutlineUseCase.requireSameItems(current, order);

    const modulesById = new Map(current.modules.map((m) => [m.id, m]));
    // Each stored lesson with the module it is in now.
    const lessonsById = new Map(
      current.modules.flatMap((m) =>
        m.lessons.map((l) => [l.id, { lesson: l, moduleId: m.id }] as const),
      ),
    );
    const operations: UnitOfWork.Operation[] = [];
    const modules: Module[] = [];
    const lessons: Lesson[] = [];
    // A module item is written once: its position and lesson count together.
    const lessonsDelta = new Map<string, number>();
    const shift = (moduleId: string, delta: number) => {
      lessonsDelta.set(moduleId, (lessonsDelta.get(moduleId) ?? 0) + delta);
    };
    const repositioned = new Map<string, Module>();

    for (const [position, entry] of order.entries()) {
      const stored = modulesById.get(entry.id);

      if (!stored) {
        throw new OutlineMismatch();
      }

      const module = new Module({
        id: Module.toId(entry.id),
        courseId,
        title: stored.title,
        position,
        lessonCount: stored.lessons.length,
      });
      modules.push(module);

      if (stored.position !== position) {
        repositioned.set(entry.id, module);
      }

      for (const [lessonPosition, lessonId] of entry.lessonIds.entries()) {
        const storedLesson = lessonsById.get(lessonId);

        if (!storedLesson) {
          throw new OutlineMismatch();
        }

        // Only the summary moves; the body stays in its own item (Q72).
        const lesson = new Lesson({
          id: lessonId,
          courseId,
          moduleId: entry.id,
          title: storedLesson.lesson.title,
          body: '',
          durationMinutes: storedLesson.lesson.durationMinutes,
          position: lessonPosition,
        });

        if (storedLesson.moduleId !== entry.id) {
          shift(storedLesson.moduleId, -1);
          shift(entry.id, 1);
          operations.push(
            ...this.lessonsRepository.moveOperations(
              lesson,
              Module.toId(storedLesson.moduleId),
            ),
          );
        } else if (storedLesson.lesson.position !== lessonPosition) {
          operations.push(this.lessonsRepository.repositionOperation(lesson));
        }

        lessons.push(lesson);
      }
    }

    for (const { id } of order) {
      const delta = lessonsDelta.get(id) ?? 0;
      const module = repositioned.get(id);

      if (module) {
        operations.push(
          this.modulesRepository.repositionOperation(module, delta),
        );
      } else if (delta !== 0) {
        operations.push(
          this.modulesRepository.addLessonsOperation(courseId, id, delta),
        );
      }
    }

    if (operations.length + 1 > ReorderOutlineUseCase.maxOperations) {
      throw new OutlineTooLarge();
    }

    if (operations.length > 0) {
      const unit = this.unitOfWork();
      unit.add(
        ...operations,
        this.coursesRepository.statusUnchangedOperation(course),
      );
      await unit.commit();
    }

    return CourseOutline.from(modules, lessons);
  }

  // The outline only reorders: every module and lesson, each once (Q229).
  private static requireSameItems(
    current: CourseOutline,
    order: ReorderOutlineUseCase.Input['modules'],
  ): void {
    const sameSet = (stored: string[], sent: string[]) =>
      stored.length === sent.length &&
      new Set(sent).size === sent.length &&
      sent.every((id) => stored.includes(id));
    const storedLessons = current.modules.flatMap((m) =>
      m.lessons.map((l) => l.id),
    );
    const sentLessons = order.flatMap((m) => m.lessonIds);

    if (
      !sameSet(
        current.modules.map((m) => m.id),
        order.map((m) => m.id),
      ) ||
      !sameSet(storedLessons, sentLessons)
    ) {
      throw new OutlineMismatch();
    }
  }
}

export namespace ReorderOutlineUseCase {
  export interface Input extends CourseEditor {
    courseId: Course.Id;
    modules: { id: Module.Id; lessonIds: Lesson.Id[] }[];
  }
}
