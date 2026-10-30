import type { UnitOfWork } from '@application/contracts/UnitOfWork';
import { DynamoUnitOfWork } from '@infra/database/dynamo/DynamoUnitOfWork';

export const makeUnitOfWork: UnitOfWork.Factory = () => new DynamoUnitOfWork();
