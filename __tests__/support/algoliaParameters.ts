import type { GetParameterCommand } from '@aws-sdk/client-ssm';
import { vi } from 'vitest';

import { ssmClient } from '@infra/clients/ssmClient';

// The Algolia settings and keys of a test stage, served by a fake SSM.
export function useAlgoliaParameters(keys: Record<string, string>) {
  const path = '/coursary-api/test/algolia';
  vi.stubEnv('ALGOLIA_PARAMETERS_PATH', path);
  vi.stubEnv('CATALOG_INDEX_NAME', 'test_courses');

  const read = (command: GetParameterCommand) =>
    Promise.resolve({
      Parameter: {
        Value: keys[(command.input.Name ?? '').slice(path.length + 1)],
      },
    });

  return vi.spyOn(ssmClient, 'send').mockImplementation(read as never);
}
