// Applies the settings of the catalog index, kept here as code (Q329).
// Reads the write key from SSM with the deploy role; prints no key.
// Usage: node --env-file=.env scripts/apply-algolia-settings.js --stage dev
import { parseArgs } from 'node:util';

import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';
import { algoliasearch } from 'algoliasearch';

const { values } = parseArgs({ options: { stage: { type: 'string' } } });

if (!values.stage) {
  console.error('Usage: apply-algolia-settings.js --stage <stage>');
  process.exit(1);
}

const settings = {
  // Most important first: a title match ranks above a description match.
  searchableAttributes: ['title', 'instructorName', 'description'],
};

const ssm = new SSMClient({ region: 'sa-east-1' });
const parameter = async (name) => {
  const { Parameter } = await ssm.send(
    new GetParameterCommand({
      Name: `/coursary-api/${values.stage}/algolia/${name}`,
      WithDecryption: true,
    }),
  );

  return Parameter.Value;
};

const indexName = `${values.stage}_courses`;
const client = algoliasearch(
  await parameter('app-id'),
  await parameter('write-key'),
);
const { taskID } = await client.setSettings({
  indexName,
  indexSettings: settings,
});
await client.waitForTask({ indexName, taskID });
const applied = await client.getSettings({ indexName });

console.log(
  `${indexName}: searchableAttributes = ${JSON.stringify(applied.searchableAttributes)}`,
);
