import type { Course } from '@application/entities/course/Course';
import type { CatalogSearch } from '@application/gateways/catalog/CatalogSearch';

export class FakeCatalogSearch implements CatalogSearch {
  courseIds: Course.Id[] = [];
  totalItems = 0;
  totalPages = 0;
  readonly searches: CatalogSearch.Params[] = [];

  search(params: CatalogSearch.Params): Promise<CatalogSearch.Result> {
    this.searches.push(params);

    return Promise.resolve({
      courseIds: this.courseIds,
      totalItems: this.totalItems,
      totalPages: this.totalPages,
    });
  }
}
