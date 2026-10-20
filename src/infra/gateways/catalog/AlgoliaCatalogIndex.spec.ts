import { describe, expect, it } from 'vitest';

import { useAlgoliaParameters } from '@tests/support/algoliaParameters';
import { anAccountId } from '@tests/support/ids';

import { Course } from '@application/entities/course/Course';
import { AlgoliaCatalogIndex } from '@infra/gateways/catalog/AlgoliaCatalogIndex';
import { AlgoliaConnection } from '@infra/gateways/catalog/AlgoliaConnection';
import { AppConfig } from '@shared/config/AppConfig';

interface SentRequest {
  method: string;
  url: string;
  data?: string | Uint8Array;
}

const readParameters = () =>
  useAlgoliaParameters({ 'app-id': 'APPID', 'write-key': 'write-key' });

const indexWithRequests = () => {
  const sent: SentRequest[] = [];
  const config = new AppConfig();
  const index = new AlgoliaCatalogIndex(
    config,
    new AlgoliaConnection(config, 'write-key', {
      requester: {
        send: (request: SentRequest) => {
          sent.push(request);

          return Promise.resolve({
            status: 200,
            content: JSON.stringify({ taskID: 1, objectID: 'x' }),
            isTimedOut: false,
          });
        },
      },
    }),
  );

  return { index, sent };
};

describe('AlgoliaCatalogIndex', () => {
  it('should save the record under the course id with only the searched fields', async () => {
    readParameters();
    const { index, sent } = indexWithRequests();
    const courseId = Course.toId(anAccountId());

    await index.save({
      courseId,
      title: 'DynamoDB',
      description: 'Keys',
      instructorName: 'Ana',
      publishedAt: '2026-10-17T12:00:00.000Z',
    });

    expect(sent).toHaveLength(1);
    // saveObject is a POST with the objectID in the body: it replaces that record.
    expect(sent[0]).toMatchObject({
      method: 'POST',
      url: expect.stringContaining(
        'https://APPID.algolia.net/1/indexes/test_courses?',
      ) as string,
    });
    expect(JSON.parse(String(sent[0]?.data))).toEqual({
      objectID: courseId,
      title: 'DynamoDB',
      description: 'Keys',
      instructorName: 'Ana',
      publishedAt: '2026-10-17T12:00:00.000Z',
    });
  });

  it('should delete the record of a course, reading the keys once', async () => {
    const send = readParameters();
    const { index, sent } = indexWithRequests();
    const courseId = Course.toId(anAccountId());

    await index.remove(courseId);
    await index.remove(courseId);

    expect(sent[0]).toMatchObject({
      method: 'DELETE',
      url: expect.stringContaining(
        `/1/indexes/test_courses/${courseId}`,
      ) as string,
    });
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('should read the keys again after a failure', async () => {
    const send = readParameters();
    send.mockRejectedValueOnce(new Error('denied'));
    const { index } = indexWithRequests();
    const courseId = Course.toId(anAccountId());

    await expect(index.remove(courseId)).rejects.toThrow('denied');
    await expect(index.remove(courseId)).resolves.toBeUndefined();
  });
});
