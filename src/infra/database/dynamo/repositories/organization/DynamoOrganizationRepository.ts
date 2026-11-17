import { Membership } from '@application/entities/organization/Membership';
import type { Organization } from '@application/entities/organization/Organization';
import type { OrganizationRepository } from '@application/repositories/organization/OrganizationRepository';
import { DynamoUnitOfWork } from '@infra/database/dynamo/DynamoUnitOfWork';
import { MembershipItem } from '@infra/database/dynamo/items/organization/MembershipItem';
import { OrganizationItem } from '@infra/database/dynamo/items/organization/OrganizationItem';
import type { AppConfig } from '@shared/config/AppConfig';

export class DynamoOrganizationRepository implements OrganizationRepository {
  constructor(private readonly config: AppConfig) {}

  async create(organization: Organization): Promise<void> {
    const unit = new DynamoUnitOfWork();
    unit.add(
      DynamoUnitOfWork.operation({
        Put: {
          TableName: this.config.mainTableName,
          Item: OrganizationItem.fromEntity(organization).toItem(),
          ConditionExpression: 'attribute_not_exists(PK)',
        },
      }),
      DynamoUnitOfWork.operation({
        Put: {
          TableName: this.config.mainTableName,
          Item: MembershipItem.fromEntity(
            Membership.ownerOf(organization),
          ).toItem(),
          ConditionExpression: 'attribute_not_exists(PK)',
        },
      }),
    );
    await unit.commit();
  }
}
