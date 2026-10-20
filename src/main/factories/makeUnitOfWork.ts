import type { UnitOfWork } from '@application/contracts/UnitOfWork';
import { DynamoUnitOfWork } from '@infra/database/dynamo/DynamoUnitOfWork';

// A new unit of work for every execution (Q87).
export const makeUnitOfWork: UnitOfWork.Factory = () => new DynamoUnitOfWork();
