import type { Course } from '@application/entities/course/Course';

export interface CatalogSearch {
  search: (params: CatalogSearch.Params) => Promise<CatalogSearch.Result>;
}

export namespace CatalogSearch {
  // Only the first results of a query can be paged (Algolia's paginationLimitedTo).
  export const maxResults = 1000;

  export interface Params {
    query: string;
    // Counted from 0.
    page: number;
    perPage: number;
  }

  export interface Result {
    courseIds: Course.Id[];
    totalItems: number;
    totalPages: number;
  }
}
