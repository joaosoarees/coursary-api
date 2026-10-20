import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import {
  CreateTableCommand,
  DynamoDBClient,
  ListTablesCommand,
} from '@aws-sdk/client-dynamodb';

const run = promisify(execFile);

const IMAGE = 'amazon/dynamodb-local:3.3.1';
const TABLE_NAME = 'coursary-api-test-MainTable';

async function startContainer(): Promise<{ endpoint: string; id: string }> {
  const { stdout } = await run('docker', [
    'run',
    '--detach',
    '--rm',
    '--publish',
    '127.0.0.1::8000',
    IMAGE,
    '-jar',
    'DynamoDBLocal.jar',
    '-inMemory',
  ]);
  const id = stdout.trim();
  const { stdout: port } = await run('docker', ['port', id, '8000']);
  const hostPort = port.trim().split(':').at(-1) ?? '';

  return { endpoint: `http://127.0.0.1:${hostPort}`, id };
}

async function waitUntilReady(client: DynamoDBClient): Promise<void> {
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      await client.send(new ListTablesCommand({}));
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  throw new Error('DynamoDB Local did not start in 10 seconds.');
}

export default async function setup(): Promise<() => Promise<void>> {
  const external = process.env.DYNAMODB_ENDPOINT;
  const container = external ? undefined : await startContainer();
  const endpoint = external ?? container?.endpoint ?? '';

  process.env.AWS_ENDPOINT_URL_DYNAMODB = endpoint;
  process.env.AWS_REGION = 'sa-east-1';
  process.env.AWS_ACCESS_KEY_ID = 'local';
  process.env.AWS_SECRET_ACCESS_KEY = 'local';
  process.env.MAIN_TABLE_NAME = TABLE_NAME;

  const client = new DynamoDBClient({});
  await waitUntilReady(client);
  await client.send(
    new CreateTableCommand({
      TableName: TABLE_NAME,
      BillingMode: 'PAY_PER_REQUEST',
      AttributeDefinitions: [
        { AttributeName: 'PK', AttributeType: 'S' },
        { AttributeName: 'SK', AttributeType: 'S' },
        { AttributeName: 'GSI1PK', AttributeType: 'S' },
        { AttributeName: 'GSI1SK', AttributeType: 'S' },
        { AttributeName: 'GSI2PK', AttributeType: 'S' },
        { AttributeName: 'GSI2SK', AttributeType: 'S' },
      ],
      KeySchema: [
        { AttributeName: 'PK', KeyType: 'HASH' },
        { AttributeName: 'SK', KeyType: 'RANGE' },
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: 'GSI1',
          KeySchema: [
            { AttributeName: 'GSI1PK', KeyType: 'HASH' },
            { AttributeName: 'GSI1SK', KeyType: 'RANGE' },
          ],
          Projection: { ProjectionType: 'ALL' },
        },
        {
          IndexName: 'GSI2',
          KeySchema: [
            { AttributeName: 'GSI2PK', KeyType: 'HASH' },
            { AttributeName: 'GSI2SK', KeyType: 'RANGE' },
          ],
          Projection: { ProjectionType: 'ALL' },
        },
      ],
    }),
  );
  client.destroy();

  return async () => {
    if (container) {
      await run('docker', ['rm', '--force', container.id]);
    }
  };
}
