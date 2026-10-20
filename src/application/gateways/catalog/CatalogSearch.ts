import type { Course } from '@application/entities/course/Course';

// Full-text search over the catalog; answers ids in relevance order (Q314, Q331).
export interface CatalogSearch {
  search: (params: CatalogSearch.Params) => Promise<CatalogSearch.Result>;
}

export namespace CatalogSearch {
  // Only the first results of a query can be paged (Algolia's paginationLimitedTo, Q327).
  export const maxResults = 1000;

  export interface Params {
    query: string;
    // Counted from 0 (Q297).
    page: number;
    perPage: number;
  }

  export interface Result {
    courseIds: Course.Id[];
    totalItems: number;
    // Only the pages that can be asked for.
    totalPages: number;
  }
}
