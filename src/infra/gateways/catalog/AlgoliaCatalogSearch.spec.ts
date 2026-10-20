import { beforeEach, describe, expect, it } from 'vitest';

import { useAlgoliaParameters } from '@tests/support/algoliaParameters';
import { anAccountId } from '@tests/support/ids';

import { AlgoliaCatalogSearch } from '@infra/gateways/catalog/AlgoliaCatalogSearch';
import { AlgoliaConnection } from '@infra/gateways/catalog/AlgoliaConnection';
import { AppConfig } from '@shared/config/AppConfig';

interface SentRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  data?: string | Uint8Array;
}

beforeEach(() => {
  useAlgoliaParameters({ 'app-id': 'APPID', 'search-key': 'search-only' });
});

describe('AlgoliaCatalogSearch', () => {
  it('should ask for ids only, from page and size as given, with the search key', async () => {
    const first = anAccountId();
    const second = anAccountId();
    const sent: SentRequest[] = [];
    const config = new AppConfig();
    const search = new AlgoliaCatalogSearch(
      config,
      new AlgoliaConnection(config, 'search-key', {
        requester: {
          send: (request: SentRequest) => {
            sent.push(request);

            return Promise.resolve({
              status: 200,
              content: JSON.stringify({
                hits: [
                  { objectID: second },
                  { objectID: 'not-a-course' },
                  { objectID: first },
                ],
                nbHits: 21,
                nbPages: 3,
                page: 1,
                hitsPerPage: 10,
              }),
              isTimedOut: false,
            });
          },
        },
      }),
    );

    await expect(
      search.search({ query: 'dynamo', page: 1, perPage: 10 }),
    ).resolves.toEqual({
      courseIds: [second, first],
      totalItems: 21,
      totalPages: 3,
    });

    expect(sent[0]?.url).toContain('/1/indexes/test_courses/query');
    expect(sent[0]?.headers['x-algolia-api-key']).toBe('search-only');
    expect(JSON.parse(String(sent[0]?.data))).toEqual({
      query: 'dynamo',
      page: 1,
      hitsPerPage: 10,
      attributesToRetrieve: [],
      attributesToHighlight: [],
    });
  });

  it('should count only the pages within the first 1,000 results, and read the keys once for calls that arrive together', async () => {
    const send = useAlgoliaParameters({
      'app-id': 'APPID',
      'search-key': 'search-only',
    });
    const config = new AppConfig();
    const search = new AlgoliaCatalogSearch(
      config,
      new AlgoliaConnection(config, 'search-key', {
        requester: {
          send: () =>
            Promise.resolve({
              status: 200,
              content: JSON.stringify({ hits: [], nbHits: 4000, nbPages: 80 }),
              isTimedOut: false,
            }),
        },
      }),
    );

    const [first] = await Promise.all([
      search.search({ query: 'a', page: 0, perPage: 50 }),
      search.search({ query: 'a', page: 1, perPage: 50 }),
    ]);

    expect(first).toMatchObject({ totalItems: 4000, totalPages: 20 });
    expect(send).toHaveBeenCalledTimes(2);
  });
});
