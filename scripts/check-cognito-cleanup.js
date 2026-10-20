// One-off check of the Cognito cleanup in a deployed stage (Q346): signs up
// without confirming, expires the account at once and waits for the TTL, the
// stream, the queue and the consumer to delete the Cognito user. The TTL takes
// from minutes to hours, so this runs for as long as it needs (up to 48 hours).
// Usage: node --env-file=.env scripts/check-cognito-cleanup.js --stage dev
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { parseArgs } from 'node:util';

import {
  AdminGetUserCommand,
  CognitoIdentityProviderClient,
  UserNotFoundException,
} from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';

const { values } = parseArgs({ options: { stage: { type: 'string' } } });

if (!values.stage) {
  console.error('Usage: check-cognito-cleanup.js --stage <stage>');
  process.exit(1);
}

const region = 'sa-east-1';
const service = `coursary-api-${values.stage}`;
const table = `${service}-MainTable`;
const baseUrl =
  process.env.E2E_BASE_URL ??
  `https://api-${values.stage}.coursary.joaodevdude.com`;
const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({ region }));
const cognito = new CognitoIdentityProviderClient({ region });
const poolId = execFileSync(
  'aws',
  [
    'cloudformation',
    'describe-stack-resource',
    '--stack-name',
    service,
    '--logical-resource-id',
    'UserPool',
    '--region',
    region,
    '--query',
    'StackResourceDetail.PhysicalResourceId',
    '--output',
    'text',
  ],
  { encoding: 'utf8' },
).trim();

const email = `success+cleanup-${Date.now()}@simulator.amazonses.com`;
const signUp = await fetch(`${baseUrl}/auth/sign-up`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    name: 'Cleanup check',
    email,
    password: `Ck${randomBytes(9).toString('hex')}1`,
  }),
});
const { accountId } = await signUp.json();

if (signUp.status !== 201) {
  throw new Error(`Sign-up answered ${signUp.status}.`);
}

// Expired a minute ago: the TTL may now delete the account and its e-mail claim.
const past = Math.floor(Date.now() / 1000) - 60;
for (const key of [
  { PK: `ACCOUNT#${accountId}`, SK: `ACCOUNT#${accountId}` },
  { PK: `EMAIL_CLAIM#${email}`, SK: `EMAIL_CLAIM#${email}` },
]) {
  await dynamo.send(
    new UpdateCommand({
      TableName: table,
      Key: key,
      UpdateExpression: 'SET expiresAt = :past',
      ConditionExpression: 'attribute_exists(PK)',
      ExpressionAttributeValues: { ':past': past },
    }),
  );
}

const started = Date.now();
const minutes = () => ((Date.now() - started) / 60_000).toFixed(1);
console.log(`Signed up ${accountId}, expired it; waiting for the TTL.`);

let accountGoneAt;
const deadline = started + 48 * 60 * 60_000;

while (Date.now() < deadline) {
  if (!accountGoneAt) {
    const { Item } = await dynamo.send(
      new GetCommand({
        TableName: table,
        Key: { PK: `ACCOUNT#${accountId}`, SK: `ACCOUNT#${accountId}` },
      }),
    );

    if (!Item) {
      accountGoneAt = minutes();
      console.log(`TTL removed the account after ${accountGoneAt} min.`);
    }
  }

  try {
    await cognito.send(
      new AdminGetUserCommand({ UserPoolId: poolId, Username: email }),
    );
  } catch (error) {
    if (error instanceof UserNotFoundException) {
      console.log(
        `Cognito user deleted after ${minutes()} min (account removed at ${accountGoneAt ?? '?'} min).`,
      );
      process.exit(0);
    }

    throw error;
  }

  await new Promise((resolve) => setTimeout(resolve, 120_000));
}

console.error('The Cognito user is still there after 48 hours.');
process.exit(1);
