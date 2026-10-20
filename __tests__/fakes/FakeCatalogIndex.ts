import type { Course } from '@application/entities/course/Course';
import type { CatalogIndex } from '@application/gateways/catalog/CatalogIndex';

export class FakeCatalogIndex implements CatalogIndex {
  readonly records = new Map<Course.Id, CatalogIndex.Record>();
  readonly removed: Course.Id[] = [];

  save(record: CatalogIndex.Record): Promise<void> {
    this.records.set(record.courseId, record);

    return Promise.resolve();
  }

  remove(courseId: Course.Id): Promise<void> {
    this.records.delete(courseId);
    this.removed.push(courseId);

    return Promise.resolve();
  }
}
