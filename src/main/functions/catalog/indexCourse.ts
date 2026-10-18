import { z } from 'zod';

import { courseIdSchema } from '@application/controllers/shared/schemas';
import { IndexCourseUseCase } from '@application/usecases/catalog/IndexCourseUseCase';
import { sqsBatchAdapter } from '@main/adapters/sqsBatchAdapter';
import { makeCatalogIndex } from '@main/factories/makeCatalogIndex';
import { makeCourseRepository } from '@main/factories/makeCourseRepository';

const schema = z.object({ courseId: courseIdSchema });
const coursesRepository = makeCourseRepository();
const catalogIndex = makeCatalogIndex();
const indexCourseUseCase = new IndexCourseUseCase(
  coursesRepository,
  catalogIndex,
);

export const handler = sqsBatchAdapter(schema, indexCourseUseCase, {
  ordered: true,
});
