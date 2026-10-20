import { type Algoliasearch, algoliasearch } from 'algoliasearch';

import { SecureParameter } from '@infra/clients/SecureParameter';
import type { AppConfig } from '@shared/config/AppConfig';

// One client per container, built once its keys were read (Q305); a failure is retried by the next call.
export class AlgoliaConnection {
  private client: Promise<Algoliasearch> | undefined;

  constructor(
    private readonly config: AppConfig,
    // `write-key` for the indexer, `search-key` for the search route (Q303).
    private readonly keyName: 'write-key' | 'search-key',
    private readonly options?: Parameters<typeof algoliasearch>[2],
  ) {}

  // Calls that arrive together share one read of the keys.
  get(): Promise<Algoliasearch> {
    this.client ??= this.connect();

    return this.client;
  }

  private async connect(): Promise<Algoliasearch> {
    const path = this.config.algoliaParametersPath;

    try {
      const [appId, apiKey] = await Promise.all([
        new SecureParameter(`${path}/app-id`).get(),
        new SecureParameter(`${path}/${this.keyName}`).get(),
      ]);

      return algoliasearch(appId, apiKey, this.options);
    } catch (error) {
      this.client = undefined;
      throw error;
    }
  }
}
