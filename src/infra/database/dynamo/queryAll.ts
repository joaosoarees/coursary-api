import { QueryCommand, type QueryCommandInput } from '@aws-sdk/lib-dynamodb';

import { dynamoClient } from '@infra/clients/dynamoClient';

// Every item a Query matches, following LastEvaluatedKey; for collections
// that are read whole and stay small (Q267: the fifth copy became this). The
// caller, which wrote the key condition, says what the items are.
export async function queryAll(
  input: Omit<QueryCommandInput, 'ExclusiveStartKey'>,
): Promise<unknown[]> {
  const items: unknown[] = [];
  let ExclusiveStartKey: Record<string, unknown> | undefined;

  do {
    const command = new QueryCommand({ ...input, ExclusiveStartKey });
    const page = await dynamoClient.send(command);
    items.push(...(page.Items ?? []));
    ExclusiveStartKey = page.LastEvaluatedKey;
  } while (ExclusiveStartKey);

  return items;
}
