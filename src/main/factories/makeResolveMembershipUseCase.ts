import { ResolveMembershipUseCase } from '@application/usecases/organization/ResolveMembershipUseCase';
import { makeMembershipRepositoryForOrg } from '@main/factories/makeMembershipRepositoryForOrg';

export function makeResolveMembershipUseCase(): ResolveMembershipUseCase {
  return new ResolveMembershipUseCase(makeMembershipRepositoryForOrg());
}
