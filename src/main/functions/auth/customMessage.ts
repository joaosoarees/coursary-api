import { renderAuthEmail } from '@infra/emails/renderAuthEmail';
import { cognitoCustomMessageAdapter } from '@main/adapters/cognitoCustomMessageAdapter';

export const handler = cognitoCustomMessageAdapter(renderAuthEmail);
