import { Course } from '@application/entities/course/Course';
import { CatalogSearch } from '@application/gateways/catalog/CatalogSearch';
import type { AlgoliaConnection } from '@infra/gateways/catalog/AlgoliaConnection';
import type { AppConfig } from '@shared/config/AppConfig';

export class AlgoliaCatalogSearch implements CatalogSearch {
  constructor(
    private readonly config: AppConfig,
    private readonly connection: AlgoliaConnection,
  ) {}

  async search({
    query,
    page,
    perPage,
  }: CatalogSearch.Params): Promise<CatalogSearch.Result> {
    const client = await this.connection.get();
    const {
      hits,
      nbHits = 0,
      nbPages = 0,
    } = await client.searchSingleIndex({
      indexName: this.config.catalogIndexName,
      // Only the ids: the table answers the rest (Q314, Q329).
      searchParams: {
        query,
        page,
        hitsPerPage: perPage,
        attributesToRetrieve: [],
        attributesToHighlight: [],
      },
    });

    return {
      courseIds: hits
        .map((hit) => hit.objectID)
        .filter((id) => Course.isId(id)),
      totalItems: nbHits,
      totalPages: Math.min(
        nbPages,
        Math.ceil(CatalogSearch.maxResults / perPage),
      ),
    };
  }
}
