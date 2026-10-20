import { describe, expect, it } from 'vitest';

import { searchSchema } from '@application/controllers/catalog/SearchCatalogController';

describe('searchSchema', () => {
  it('should trim the text and default to the first page of 20', () => {
    expect(searchSchema.parse({ q: '  dynamo ' })).toEqual({
      q: 'dynamo',
      page: 0,
      perPage: 20,
    });
  });

  it('should accept any page that starts within the first 1,000 results', () => {
    expect(
      searchSchema.safeParse({ q: 'x', page: '99', perPage: '10' }).success,
    ).toBe(true);
    expect(
      searchSchema.safeParse({ q: 'x', page: '19', perPage: '50' }).success,
    ).toBe(true);
  });

  it.each([
    [{}],
    [{ q: '   ' }],
    [{ q: 'x'.repeat(201) }],
    [{ q: 'x', page: '-1' }],
    [{ q: 'x', page: '50' }],
    [{ q: 'x', page: '20', perPage: '50' }],
    [{ q: 'x', perPage: '0' }],
    [{ q: 'x', perPage: '51' }],
  ])('should refuse %o', (query) => {
    expect(searchSchema.safeParse(query).success).toBe(false);
  });
});
