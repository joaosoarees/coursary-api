import { z } from 'zod';

import { courseIdSchema } from '@application/controllers/shared/schemas';
import { DeleteCourseContentUseCase } from '@application/usecases/course/DeleteCourseContentUseCase';
import { sqsBatchAdapter } from '@main/adapters/sqsBatchAdapter';
import { makeCourseDeletionQueue } from '@main/factories/makeCourseDeletionQueue';
import { makeCourseDeletionRepository } from '@main/factories/makeCourseDeletionRepository';
import { makeFileStorage } from '@main/factories/makeFileStorage';

const schema = z.object({ courseId: courseIdSchema });
const deleteCourseContentUseCase = new DeleteCourseContentUseCase(
  makeCourseDeletionRepository(),
  makeCourseDeletionQueue(),
  makeFileStorage(),
);

export const handler = sqsBatchAdapter(schema, deleteCourseContentUseCase, {
  ordered: false,
});
