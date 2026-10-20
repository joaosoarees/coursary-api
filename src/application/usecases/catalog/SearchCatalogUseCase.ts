import { courseStatuses } from '@application/entities/course/Course';
import type { CatalogSearch } from '@application/gateways/catalog/CatalogSearch';
import { CatalogItem } from '@application/queries/catalog/CatalogItem';
import type { CourseRepository } from '@application/repositories/course/CourseRepository';

// The index picks and orders the courses; the table says what they are now (Q314, Q326).
export class SearchCatalogUseCase {
  constructor(
    private readonly catalogSearch: CatalogSearch,
    private readonly coursesRepository: CourseRepository,
  ) {}

  async execute(
    params: SearchCatalogUseCase.Input,
  ): Promise<SearchCatalogUseCase.Output> {
    const { courseIds, totalItems, totalPages } =
      await this.catalogSearch.search(params);
    const courses = await this.coursesRepository.findManyByIds(courseIds);

    const items = courseIds.flatMap((courseId) => {
      const course = courses.get(courseId);

      if (course?.status !== courseStatuses.Published) {
        console.warn(JSON.stringify({ event: 'SearchHitDropped', courseId }));

        return [];
      }

      return [CatalogItem.fromCourse(course)];
    });

    return { items, page: params.page, totalPages, totalItems };
  }
}

export namespace SearchCatalogUseCase {
  export type Input = CatalogSearch.Params;

  export interface Output {
    items: CatalogItem[];
    page: number;
    totalPages: number;
    totalItems: number;
  }
}
