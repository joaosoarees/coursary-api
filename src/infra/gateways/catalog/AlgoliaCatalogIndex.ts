import type { Course } from '@application/entities/course/Course';
import type { CatalogIndex } from '@application/gateways/catalog/CatalogIndex';
import type { AlgoliaConnection } from '@infra/gateways/catalog/AlgoliaConnection';
import type { AppConfig } from '@shared/config/AppConfig';

export class AlgoliaCatalogIndex implements CatalogIndex {
  constructor(
    private readonly config: AppConfig,
    private readonly connection: AlgoliaConnection,
  ) {}

  // The objectID is the course id, so saving twice rewrites one record.
  async save(record: CatalogIndex.Record): Promise<void> {
    const client = await this.connection.get();
    await client.saveObject({
      indexName: this.config.catalogIndexName,
      body: {
        objectID: record.courseId,
        title: record.title,
        description: record.description,
        instructorName: record.instructorName,
        publishedAt: record.publishedAt,
      },
    });
  }

  async remove(courseId: Course.Id): Promise<void> {
    const client = await this.connection.get();
    await client.deleteObject({
      indexName: this.config.catalogIndexName,
      objectID: courseId,
    });
  }
}
