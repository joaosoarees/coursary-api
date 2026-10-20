import { IssueTokenClaimsUseCase } from '@application/usecases/auth/IssueTokenClaimsUseCase';
import { cognitoPreTokenAdapter } from '@main/adapters/cognitoPreTokenAdapter';
import { makeAccountRepository } from '@main/factories/makeAccountRepository';

const accountsRepository = makeAccountRepository();
const issueTokenClaimsUseCase = new IssueTokenClaimsUseCase(accountsRepository);

export const handler = cognitoPreTokenAdapter(issueTokenClaimsUseCase);
