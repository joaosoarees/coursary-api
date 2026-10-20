import { MalformedBody } from '@application/errors/common';

export function lambdaBodyParser(
  body: string | undefined,
  isBase64Encoded = false,
): unknown {
  if (!body) {
    return {};
  }

  const text = isBase64Encoded
    ? Buffer.from(body, 'base64').toString('utf8')
    : body;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new MalformedBody();
  }
}
