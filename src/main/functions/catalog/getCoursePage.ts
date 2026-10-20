import { GetCoursePageController } from '@application/controllers/catalog/GetCoursePageController';
import { GetCoursePageUseCase } from '@application/usecases/catalog/GetCoursePageUseCase';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';
import { makeCoursePageQuery } from '@main/factories/makeCoursePageQuery';

const coursePageQuery = makeCoursePageQuery();
const getCoursePageUseCase = new GetCoursePageUseCase(coursePageQuery);
const controller = new GetCoursePageController(getCoursePageUseCase);

export const handler = lambdaHttpAdapter(controller);
