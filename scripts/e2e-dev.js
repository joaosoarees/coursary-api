// Calls the deployed dev API as real clients do, with throwaway accounts that it
// creates, confirms and deletes itself: no mailbox, no token pasted by hand.
// Needs the project's AWS credentials (AWS_PROFILE in .env).
import { execFileSync } from 'node:child_process';
import { createHmac, randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import sharp from 'sharp';

const stage = 'dev';
const region = 'sa-east-1';
const baseUrl =
  process.env.E2E_BASE_URL ?? 'https://api-dev.coursary.joaodevdude.com';
const service = `coursary-api-${stage}`;
const table = `${service}-MainTable`;

function aws(...args) {
  const output = execFileSync(
    'aws',
    [...args, '--region', region, '--output', 'json'],
    // stderr goes into the thrown error: checks that expect a 404 print nothing.
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );

  return output.trim() ? JSON.parse(output) : undefined;
}

const poolId = aws(
  'cloudformation',
  'describe-stack-resource',
  '--stack-name',
  service,
  '--logical-resource-id',
  'UserPool',
).StackResourceDetail.PhysicalResourceId;

const stackResource = (logicalId) =>
  aws(
    'cloudformation',
    'describe-stack-resource',
    '--stack-name',
    service,
    '--logical-resource-id',
    logicalId,
  ).StackResourceDetail.PhysicalResourceId;
const privateBucket = stackResource('PrivateFilesBucket');
const publicBucket = stackResource('PublicAssetsBucket');

async function call(method, path, { token, body, headers = {} } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();

  return {
    status: response.status,
    body: text ? JSON.parse(text) : undefined,
    setCookies: response.headers.getSetCookie(),
    headers: response.headers,
  };
}

// The search index is read with the search-only key, as the search route will.
const algoliaKey = (name) =>
  aws(
    'ssm',
    'get-parameter',
    '--with-decryption',
    '--name',
    `/coursary-api/${stage}/algolia/${name}`,
  ).Parameter.Value;
const algolia = {
  appId: algoliaKey('app-id'),
  searchKey: algoliaKey('search-key'),
  index: `${stage}_courses`,
};

async function indexRecord(courseId) {
  const response = await fetch(
    `https://${algolia.appId}-dsn.algolia.net/1/indexes/${algolia.index}/${courseId}`,
    {
      headers: {
        'x-algolia-application-id': algolia.appId,
        'x-algolia-api-key': algolia.searchKey,
      },
    },
  );

  return { status: response.status, body: await response.json() };
}

async function waitForIndex(courseId, status) {
  const deadline = Date.now() + 60_000;
  let record = await indexRecord(courseId);

  while (record.status !== status && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    record = await indexRecord(courseId);
  }

  return record;
}

async function waitForMail(accountId, sk) {
  const deadline = Date.now() + 60_000;
  const read = () =>
    aws(
      'dynamodb',
      'get-item',
      '--table-name',
      table,
      '--consistent-read',
      '--key',
      JSON.stringify({
        PK: { S: `ACCOUNT#${accountId}` },
        SK: { S: sk },
      }),
    )?.Item;
  let item = read();

  while (item?.status?.S !== 'SENT' && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    item = read();
  }

  return item;
}

let failures = 0;

function check(name, response, status, code) {
  const passed =
    response.status === status &&
    (code === undefined || response.body?.error?.code === code);
  failures += passed ? 0 : 1;
  const expected = code ? `${status} ${code}` : String(status);
  const got = `${response.status} ${response.body?.error?.code ?? ''}`.trim();
  console.log(
    `${passed ? 'ok  ' : 'FAIL'} ${name} (expected ${expected}, got ${got})`,
  );
}

const created = [];

async function createAccount(label) {
  const email = `success+e2e-${label}-${Date.now()}@simulator.amazonses.com`;
  const password = `E2e${randomBytes(9).toString('hex')}1`;
  const signUp = await call('POST', '/auth/sign-up', {
    body: { name: `E2E ${label}`, email, password },
  });

  if (signUp.status !== 201) {
    throw new Error(`Sign-up of ${label} answered ${signUp.status}.`);
  }

  created.push({ email, accountId: signUp.body.accountId });
  aws(
    'cognito-idp',
    'admin-confirm-sign-up',
    '--user-pool-id',
    poolId,
    '--username',
    email,
  );
  // The confirmation route needs the code sent by e-mail; this writes what it
  // writes: the account ACTIVE and both items without expiresAt.
  const accountKey = {
    PK: { S: `ACCOUNT#${signUp.body.accountId}` },
    SK: { S: `ACCOUNT#${signUp.body.accountId}` },
  };
  const claimKey = {
    PK: { S: `EMAIL_CLAIM#${email}` },
    SK: { S: `EMAIL_CLAIM#${email}` },
  };
  aws(
    'dynamodb',
    'update-item',
    '--table-name',
    table,
    '--key',
    JSON.stringify(accountKey),
    '--update-expression',
    'SET #status = :active REMOVE expiresAt',
    '--expression-attribute-names',
    JSON.stringify({ '#status': 'status' }),
    '--expression-attribute-values',
    JSON.stringify({ ':active': { S: 'ACTIVE' } }),
  );
  aws(
    'dynamodb',
    'update-item',
    '--table-name',
    table,
    '--key',
    JSON.stringify(claimKey),
    '--update-expression',
    'REMOVE expiresAt',
  );

  return { email, password, accountId: signUp.body.accountId };
}

const siteOrigin =
  process.env.E2E_SITE_ORIGIN ?? 'https://coursary-dev.joaodevdude.com';

const sessionCookieName = 'coursary_refresh';

// The refresh token travels only in the HttpOnly cookie; the checks below keep it beside
// the body, as a browser keeps the cookie beside the page.
const refreshTokenOf = (response) =>
  response.setCookies
    .find((cookie) => cookie.startsWith(`${sessionCookieName}=`))
    ?.split(';')[0]
    .slice(sessionCookieName.length + 1);

const withSession = (response) =>
  response.body && response.status === 200
    ? {
        ...response,
        body: { ...response.body, refreshToken: refreshTokenOf(response) },
      }
    : response;

const signIn = async (account, origin = siteOrigin) =>
  withSession(
    await call('POST', '/auth/sign-in', {
      body: { email: account.email, password: account.password },
      headers: origin ? { origin } : {},
    }),
  );

const refresh = async (refreshToken, origin = siteOrigin) =>
  withSession(
    await call('POST', '/auth/refresh', {
      headers: {
        cookie: `${sessionCookieName}=${refreshToken}`,
        ...(origin ? { origin } : {}),
      },
    }),
  );

const me = (token) => call('GET', '/me', { token });

// Posts the form S3 signed, as a browser would: every field, then the file last.
async function postToS3({ url, fields }, bytes, type) {
  const form = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    form.append(name, value);
  }
  form.append('file', new Blob([bytes], { type }));
  const response = await fetch(url, { method: 'POST', body: form });
  const text = await response.text();

  return {
    status: response.status,
    body: { error: { code: /<Code>(\w+)<\/Code>/.exec(text)?.[1] } },
  };
}

async function waitForAvatar(token, previous) {
  const deadline = Date.now() + 60_000;
  let profile = (await me(token)).body;

  while (
    (!profile?.avatarUrl || profile.avatarUrl['64'] === previous?.['64']) &&
    Date.now() < deadline
  ) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    profile = (await me(token)).body;
  }

  return profile?.avatarUrl;
}

const fileStatus = (accountId, fileId) =>
  aws(
    'dynamodb',
    'get-item',
    '--table-name',
    table,
    '--consistent-read',
    '--key',
    JSON.stringify({
      PK: { S: `ACCOUNT#${accountId}` },
      SK: { S: `FILE#avatar#${fileId}` },
    }),
  )?.Item?.status?.S;

const isInBucket = (bucket, key) => {
  try {
    aws('s3api', 'head-object', '--bucket', bucket, '--key', key);
    return true;
  } catch {
    return false;
  }
};

const prefixIsEmpty = (bucket, prefix) =>
  !aws(
    's3api',
    'list-objects-v2',
    '--bucket',
    bucket,
    '--prefix',
    prefix,
    '--max-items',
    '1',
  )?.Contents?.length;

const partitionOf = (pk) =>
  aws(
    'dynamodb',
    'query',
    '--table-name',
    table,
    '--consistent-read',
    '--key-condition-expression',
    'PK = :pk',
    '--expression-attribute-values',
    JSON.stringify({ ':pk': { S: pk } }),
  )?.Items ?? [];

async function waitForFile(pk, purpose, status) {
  const deadline = Date.now() + 60_000;

  while (Date.now() < deadline) {
    const settled = partitionOf(pk).some(
      (item) =>
        item.SK.S.startsWith(`FILE#${purpose}#`) && item.status?.S === status,
    );

    if (settled) {
      return true;
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  return false;
}

const fileItem = (pk, sk) =>
  aws(
    'dynamodb',
    'get-item',
    '--table-name',
    table,
    '--consistent-read',
    '--key',
    JSON.stringify({ PK: { S: pk }, SK: { S: sk } }),
  )?.Item;

async function waitForVideo(lessonId, fileId) {
  const deadline = Date.now() + 60_000;
  let item = fileItem(`LESSON#${lessonId}`, `FILE#video#${fileId}`);

  while (item?.status?.S !== 'UPLOADED' && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    item = fileItem(`LESSON#${lessonId}`, `FILE#video#${fileId}`);
  }

  return item;
}

// S3 answers NoSuchUpload once an upload is completed or aborted.
const uploadIsGone = (key, uploadId) => {
  try {
    aws(
      's3api',
      'list-parts',
      '--bucket',
      privateBucket,
      '--key',
      key,
      '--upload-id',
      uploadId,
    );
    return false;
  } catch {
    return true;
  }
};

async function cleanUp() {
  for (const { email, accountId } of created) {
    try {
      aws(
        'cognito-idp',
        'admin-delete-user',
        '--user-pool-id',
        poolId,
        '--username',
        email,
      );
    } catch {
      // Already gone.
    }

    const { Items = [] } = aws(
      'dynamodb',
      'query',
      '--table-name',
      table,
      '--key-condition-expression',
      'PK = :pk',
      '--expression-attribute-values',
      JSON.stringify({ ':pk': { S: `ACCOUNT#${accountId}` } }),
      '--projection-expression',
      'PK, SK',
    );
    const { Items: courses = [] } = aws(
      'dynamodb',
      'query',
      '--table-name',
      table,
      '--index-name',
      'GSI1',
      '--key-condition-expression',
      'GSI1PK = :pk',
      '--expression-attribute-values',
      JSON.stringify({ ':pk': { S: `INSTRUCTOR#${accountId}` } }),
      '--projection-expression',
      'PK, SK',
    );
    const coursePartitions = courses.flatMap((course) => {
      const { Items: inside = [] } = aws(
        'dynamodb',
        'query',
        '--table-name',
        table,
        '--key-condition-expression',
        'PK = :pk',
        '--expression-attribute-values',
        JSON.stringify({ ':pk': course.PK }),
        '--projection-expression',
        'PK, SK, #type, id',
        '--expression-attribute-names',
        JSON.stringify({ '#type': 'type' }),
      );

      const lessonPartition = (lessonId) =>
        (
          aws(
            'dynamodb',
            'query',
            '--table-name',
            table,
            '--key-condition-expression',
            'PK = :pk',
            '--expression-attribute-values',
            JSON.stringify({ ':pk': { S: `LESSON#${lessonId}` } }),
            '--projection-expression',
            'PK, SK',
          ).Items ?? []
        ).map((key) => ({ PK: key.PK, SK: key.SK }));

      return inside.flatMap((item) =>
        item.type?.S === 'Lesson'
          ? [{ PK: item.PK, SK: item.SK }, ...lessonPartition(item.id.S)]
          : [{ PK: item.PK, SK: item.SK }],
      );
    });
    const keys = [
      ...Items,
      ...coursePartitions,
      { PK: { S: `EMAIL_CLAIM#${email}` }, SK: { S: `EMAIL_CLAIM#${email}` } },
    ];

    for (const key of keys) {
      aws(
        'dynamodb',
        'delete-item',
        '--table-name',
        table,
        '--key',
        JSON.stringify(key),
      );
    }

    const lessonIds = [
      ...new Set(
        coursePartitions
          .filter((key) => key.PK.S.startsWith('LESSON#'))
          .map((key) => key.PK.S.slice('LESSON#'.length)),
      ),
    ];
    const prefixes = [
      `account/${accountId}/`,
      ...lessonIds.map((id) => `lesson/${id}/`),
      ...courses.flatMap((course) => [
        `course/${course.PK.S.slice('COURSE#'.length)}/`,
        // The student CSVs; their records go by the TTL.
        `exports/${course.PK.S.slice('COURSE#'.length)}/`,
      ]),
    ];
    for (const [bucket, prefix] of [privateBucket, publicBucket].flatMap(
      (bucket) => prefixes.map((prefix) => [bucket, prefix]),
    )) {
      execFileSync('aws', [
        's3',
        'rm',
        `s3://${bucket}/${prefix}`,
        '--recursive',
        '--quiet',
        '--region',
        region,
      ]);
    }
  }
}

try {
  const student = await createAccount('student');
  const admin = await createAccount('admin');
  const otherInstructor = await createAccount('instructor');
  const plainStudent = await createAccount('learner');
  aws(
    'lambda',
    'invoke',
    '--function-name',
    `${service}-promoteAdmin`,
    '--cli-binary-format',
    'raw-in-base64-out',
    '--payload',
    JSON.stringify({ email: admin.email }),
    '/dev/null',
  );

  console.log('\n# Welcome e-mail (3.5)');
  const welcome = await waitForMail(student.accountId, 'MAIL#welcome');
  check(
    'a confirmed account gets its welcome e-mail through SES, once',
    {
      status:
        welcome?.status?.S === 'SENT' &&
        welcome.sesMessageId?.S &&
        welcome.attempts?.N === '1'
          ? 200
          : 500,
    },
    200,
  );

  console.log('\n# Single session (Q210)');
  const first = (await signIn(student)).body;
  check('student signs in', await me(first.accessToken), 200);
  const second = (await signIn(student)).body;
  check(
    'a second sign-in ends the first access token',
    await me(first.accessToken),
    401,
    'INVALID_SESSION',
  );
  check(
    'a second sign-in ends the first refresh token',
    await refresh(first.refreshToken),
    401,
    'INVALID_SESSION',
  );
  check('the second access token works', await me(second.accessToken), 200);
  const refreshed = (await refresh(second.refreshToken)).body;
  check(
    'a refresh ends the access token before it',
    await me(second.accessToken),
    401,
    'INVALID_SESSION',
  );
  check(
    'the refreshed access token works',
    await me(refreshed.accessToken),
    200,
  );

  console.log('\n# Session cookie (6.1, Q481, Q482)');
  check(
    'a sign-in from another site is refused (login CSRF)',
    await signIn(student, 'https://elsewhere.joaodevdude.com'),
    403,
    'FORBIDDEN',
  );
  const rawSignIn = await call('POST', '/auth/sign-in', {
    body: { email: student.email, password: student.password },
    headers: { origin: siteOrigin },
  });
  const sessionCookie = rawSignIn.setCookies.find((cookie) =>
    cookie.startsWith(`${sessionCookieName}=`),
  );
  check(
    'sign-in answers without the refresh token in the body',
    {
      status:
        rawSignIn.status === 200 &&
        rawSignIn.body?.accessToken &&
        !('refreshToken' in rawSignIn.body)
          ? 200
          : 500,
    },
    200,
  );
  check(
    'the refresh token comes in an HttpOnly, Secure, Lax cookie for /auth only',
    {
      status: ['HttpOnly', 'Secure', 'SameSite=Lax', 'Path=/auth'].every(
        (attribute) => sessionCookie?.includes(attribute),
      )
        ? 200
        : 500,
    },
    200,
  );
  const cookieToken = refreshTokenOf(rawSignIn);
  check(
    'a refresh without the Origin header is refused',
    await refresh(cookieToken, null),
    403,
    'FORBIDDEN',
  );
  check(
    'a refresh from another origin is refused',
    await refresh(cookieToken, 'https://elsewhere.joaodevdude.com'),
    403,
    'FORBIDDEN',
  );
  const third = (await refresh(cookieToken)).body;
  check(
    'a refresh from the site works with the cookie',
    await me(third.accessToken),
    200,
  );

  console.log('\n# Token scope (Q301)');
  const scopes = JSON.parse(
    Buffer.from(first.accessToken.split('.')[1], 'base64url').toString('utf8'),
  ).scope;
  check(
    'the access token carries the scope private routes require',
    {
      status: scopes?.split(' ').includes('aws.cognito.signin.user.admin')
        ? 200
        : 500,
      body: { scopes },
    },
    200,
  );
  // An id token straight from Cognito: the app never hands one out.
  const clientId = aws(
    'cloudformation',
    'describe-stack-resource',
    '--stack-name',
    service,
    '--logical-resource-id',
    'UserPoolClient',
  ).StackResourceDetail.PhysicalResourceId;
  const clientSecret = aws(
    'cognito-idp',
    'describe-user-pool-client',
    '--user-pool-id',
    poolId,
    '--client-id',
    clientId,
  ).UserPoolClient.ClientSecret;
  const secretHash = createHmac('sha256', clientSecret)
    .update(student.email + clientId)
    .digest('base64');
  // The password goes through a private temp file, not the command line.
  const authInput = join(
    mkdtempSync(join(tmpdir(), 'e2e-')),
    'initiate-auth.json',
  );
  writeFileSync(
    authInput,
    JSON.stringify({
      ClientId: clientId,
      AuthFlow: 'USER_PASSWORD_AUTH',
      AuthParameters: {
        USERNAME: student.email,
        PASSWORD: student.password,
        SECRET_HASH: secretHash,
      },
    }),
    { mode: 0o600 },
  );
  let idToken;

  try {
    idToken = aws(
      'cognito-idp',
      'initiate-auth',
      '--cli-input-json',
      `file://${authInput}`,
    ).AuthenticationResult.IdToken;
  } finally {
    rmSync(dirname(authInput), { recursive: true, force: true });
  }

  check('an id token is refused at the gateway', await me(idToken), 403);

  console.log('\n# Avatar (Q378 to Q394)');
  const studentToken = third.accessToken;
  const requestAvatar = (contentType) =>
    call('POST', '/me/avatar', { token: studentToken, body: { contentType } });
  check(
    'an avatar of another type is refused',
    await requestAvatar('image/gif'),
    400,
    'VALIDATION',
  );
  const photo = (r, g, b) =>
    sharp({
      create: { width: 640, height: 480, channels: 3, background: { r, g, b } },
    })
      .png()
      .toBuffer();
  const firstUpload = await requestAvatar('image/png');
  check('student asks to upload an avatar', firstUpload, 201);
  check(
    'S3 takes the PNG through the signed POST',
    await postToS3(firstUpload.body, await photo(200, 80, 40), 'image/png'),
    204,
  );
  const avatarUrl = await waitForAvatar(studentToken);
  check(
    'GET /me shows the avatar in 64 and 256',
    { status: avatarUrl?.['64'] && avatarUrl['256'] ? 200 : 500 },
    200,
  );

  for (const [size, url] of Object.entries(avatarUrl ?? {})) {
    const response = await fetch(url);
    const bytes = new Uint8Array(await response.arrayBuffer());
    const { format, width, height } = await sharp(bytes).metadata();
    check(
      `the ${size} variant comes from the CDN as an immutable square webp`,
      {
        status:
          response.status === 200 &&
          response.headers.get('content-type') === 'image/webp' &&
          response.headers.get('cache-control')?.includes('immutable') &&
          format === 'webp' &&
          width === Number(size) &&
          height === Number(size)
            ? 200
            : 500,
      },
      200,
    );
  }

  const secondUpload = await requestAvatar('image/jpeg');
  const blue = await sharp(await photo(40, 80, 200))
    .jpeg()
    .toBuffer();
  await postToS3(secondUpload.body, blue, 'image/jpeg');
  const newAvatarUrl = await waitForAvatar(studentToken, avatarUrl);
  const oldKey = avatarUrl ? new URL(avatarUrl['64']).pathname.slice(1) : '';
  // The old variants leave after the commit that GET /me already shows.
  const cleanupDeadline = Date.now() + 30_000;
  while (isInBucket(publicBucket, oldKey) && Date.now() < cleanupDeadline) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  check(
    'a new avatar replaces the old one and its variants leave the bucket',
    {
      status:
        newAvatarUrl &&
        newAvatarUrl['64'] !== avatarUrl?.['64'] &&
        !isInBucket(publicBucket, oldKey)
          ? 200
          : 500,
    },
    200,
  );

  const tooLarge = await requestAvatar('image/png');
  check(
    'S3 refuses a file over 5 MB',
    await postToS3(
      tooLarge.body,
      randomBytes(5 * 1024 * 1024 + 1),
      'image/png',
    ),
    400,
    'EntityTooLarge',
  );

  const notAnImage = await requestAvatar('image/png');
  await postToS3(
    notAnImage.body,
    new TextEncoder().encode('<html>not an image</html>'),
    'image/png',
  );
  const failDeadline = Date.now() + 60_000;
  while (
    fileStatus(student.accountId, notAnImage.body.fileId) !== 'FAILED' &&
    Date.now() < failDeadline
  ) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  check(
    'text sent as a PNG ends FAILED and leaves the avatar as it was',
    {
      status:
        fileStatus(student.accountId, notAnImage.body.fileId) === 'FAILED' &&
        (await me(studentToken)).body?.avatarUrl?.['64'] ===
          newAvatarUrl?.['64']
          ? 200
          : 500,
    },
    200,
  );

  console.log('\n# Admin and permissions');
  const adminTokens = (await signIn(admin)).body;
  check(
    'admin lists students',
    await call('GET', '/admin/users?role=student', {
      token: adminTokens.accessToken,
    }),
    200,
  );
  check(
    'a student is refused on an admin route',
    await call('GET', '/admin/users?role=student', {
      token: third.accessToken,
    }),
    403,
    'FORBIDDEN',
  );
  check(
    'admin cannot disable itself',
    await call('POST', `/admin/users/${admin.accountId}/disable`, {
      token: adminTokens.accessToken,
    }),
    403,
    'CANNOT_CHANGE_OWN_STATUS',
  );
  check(
    'admin makes the student an instructor',
    await call('PUT', `/admin/users/${student.accountId}/role`, {
      token: adminTokens.accessToken,
      body: { role: 'instructor' },
    }),
    200,
  );
  const history = await call(
    'GET',
    `/admin/users/${student.accountId}/role-changes`,
    { token: adminTokens.accessToken },
  );
  check(
    'the role change is in the history',
    {
      status: history.body?.items?.length === 1 ? 200 : 500,
      body: history.body,
    },
    200,
  );

  console.log('\n# Courses (1.13)');
  const instructorToken = third.accessToken;
  await call('PUT', `/admin/users/${otherInstructor.accountId}/role`, {
    token: adminTokens.accessToken,
    body: { role: 'instructor' },
  });
  const otherToken = (await signIn(otherInstructor)).body.accessToken;
  const learnerToken = (await signIn(plainStudent)).body.accessToken;
  const created_ = await call('POST', '/courses', {
    token: instructorToken,
    body: { title: 'E2E course', description: 'Created by e2e:dev' },
  });
  check('an instructor creates a course', created_, 201);
  const courseId = created_.body?.id;
  check(
    'the instructor edits the course',
    await call('PATCH', `/courses/${courseId}`, {
      token: instructorToken,
      body: { title: 'E2E course, edited' },
    }),
    200,
  );
  const mine = await call('GET', '/instructor/courses', {
    token: instructorToken,
  });
  check(
    'the course is in the instructor list',
    {
      status: mine.body?.items?.some((item) => item.id === courseId)
        ? 200
        : 500,
      body: mine.body,
    },
    200,
  );
  check(
    'another instructor does not see the draft',
    await call('PATCH', `/courses/${courseId}`, {
      token: otherToken,
      body: { title: 'Not mine' },
    }),
    404,
    'COURSE_NOT_FOUND',
  );
  check(
    'an admin edits any course',
    await call('PATCH', `/courses/${courseId}`, {
      token: adminTokens.accessToken,
      body: { description: 'Edited by an admin' },
    }),
    200,
  );
  console.log('\n# Course cover (Q399 to Q404)');
  const coverUpload = await call('POST', `/courses/${courseId}/cover`, {
    token: instructorToken,
    body: { contentType: 'image/jpeg' },
  });
  check('the instructor asks to upload a cover', coverUpload, 201);
  const coverPhoto = await sharp({
    create: {
      width: 1600,
      height: 900,
      channels: 3,
      background: { r: 30, g: 120, b: 90 },
    },
  })
    .jpeg()
    .toBuffer();
  check(
    'S3 takes the cover through the signed POST',
    await postToS3(coverUpload.body, coverPhoto, 'image/jpeg'),
    204,
  );
  const coverDeadline = Date.now() + 60_000;
  let coverUrl;
  while (!coverUrl && Date.now() < coverDeadline) {
    const list = await call('GET', '/instructor/courses', {
      token: instructorToken,
    });
    coverUrl = list.body?.items?.find((item) => item.id === courseId)?.coverUrl;
    if (!coverUrl) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
  check(
    'the instructor list shows the cover in 480 and 1280',
    { status: coverUrl?.['480'] && coverUrl['1280'] ? 200 : 500 },
    200,
  );
  const detailsAfterCover = await call('PATCH', `/courses/${courseId}`, {
    token: instructorToken,
    body: { title: 'E2E course, edited' },
  });
  check(
    'the course details show the same cover',
    {
      status:
        detailsAfterCover.body?.coverUrl?.['1280'] === coverUrl?.['1280']
          ? 200
          : 500,
    },
    200,
  );
  for (const [size, height] of [
    ['480', 270],
    ['1280', 720],
  ]) {
    const response = await fetch(coverUrl?.[size] ?? '');
    const bytes = new Uint8Array(await response.arrayBuffer());
    const meta = response.ok ? await sharp(bytes).metadata() : {};
    check(
      `the ${size} cover comes from the CDN as a 16:9 webp`,
      {
        status:
          response.status === 200 &&
          meta.format === 'webp' &&
          meta.width === Number(size) &&
          meta.height === height
            ? 200
            : 500,
      },
      200,
    );
  }

  check(
    'a student cannot create a course',
    await call('POST', '/courses', {
      token: learnerToken,
      body: { title: 'Not allowed' },
    }),
    403,
    'FORBIDDEN',
  );
  check(
    'a malformed course id is a validation error',
    await call('PATCH', '/courses/nope', {
      token: instructorToken,
      body: { title: 'X Y Z' },
    }),
    400,
    'VALIDATION',
  );
  await call('PATCH', '/me', {
    token: instructorToken,
    body: { name: 'E2E renamed' },
  });
  const afterRename = await call('PATCH', `/courses/${courseId}`, {
    token: instructorToken,
    body: { description: 'After rename' },
  });
  check(
    'renaming the instructor renames the course copy',
    {
      status: afterRename.body?.instructorName === 'E2E renamed' ? 200 : 500,
      body: afterRename.body,
    },
    200,
  );

  console.log('\n# Modules, lessons and outline (1.14)');
  const outlinePath = `/courses/${courseId}/outline`;
  const addModule = async (title) =>
    (
      await call('POST', `/courses/${courseId}/modules`, {
        token: instructorToken,
        body: { title },
      })
    ).body;
  const addLesson = async (moduleId, title) =>
    call('POST', `/courses/${courseId}/modules/${moduleId}/lessons`, {
      token: instructorToken,
      body: { title, body: `# ${title}`, durationMinutes: 10 },
    });
  const moduleA = await addModule('Module A');
  const moduleB = await addModule('Module B');
  const firstLesson = await addLesson(moduleA.id, 'Lesson 1');
  check('the instructor adds a lesson', firstLesson, 201);
  const l1 = firstLesson.body.id;
  const l2 = (await addLesson(moduleA.id, 'Lesson 2')).body.id;
  const l3 = (await addLesson(moduleB.id, 'Lesson 3')).body.id;
  const shape = (outline) =>
    JSON.stringify(
      outline?.modules?.map((m) => [m.id, m.lessons.map((l) => l.id)]),
    );
  const before = await call('GET', outlinePath, { token: instructorToken });
  check(
    'the outline lists modules and lessons in order',
    {
      status:
        shape(before.body) ===
        JSON.stringify([
          [moduleA.id, [l1, l2]],
          [moduleB.id, [l3]],
        ])
          ? 200
          : 500,
      body: before.body,
    },
    200,
  );
  const newOrder = [
    { id: moduleB.id, lessonIds: [l3, l1] },
    { id: moduleA.id, lessonIds: [l2] },
  ];
  check(
    'the instructor reorders, moving a lesson to another module',
    await call('PUT', outlinePath, {
      token: instructorToken,
      body: { modules: newOrder },
    }),
    200,
  );
  const after = await call('GET', outlinePath, { token: instructorToken });
  check(
    'the outline keeps the new order',
    {
      status:
        shape(after.body) ===
        JSON.stringify([
          [moduleB.id, [l3, l1]],
          [moduleA.id, [l2]],
        ])
          ? 200
          : 500,
      body: after.body,
    },
    200,
  );
  check(
    'an outline that leaves a lesson out is refused',
    await call('PUT', outlinePath, {
      token: instructorToken,
      body: {
        modules: [
          { id: moduleB.id, lessonIds: [l3] },
          { id: moduleA.id, lessonIds: [l2] },
        ],
      },
    }),
    400,
    'OUTLINE_MISMATCH',
  );
  check(
    'another instructor does not see the outline of the draft',
    await call('GET', outlinePath, { token: otherToken }),
    404,
    'COURSE_NOT_FOUND',
  );
  check(
    'a student cannot add a module',
    await call('POST', `/courses/${courseId}/modules`, {
      token: learnerToken,
      body: { title: 'Nope' },
    }),
    403,
    'FORBIDDEN',
  );
  check(
    'a lesson body over 32 KiB is refused',
    await call('POST', `/courses/${courseId}/modules/${moduleA.id}/lessons`, {
      token: instructorToken,
      body: {
        title: 'Too long',
        body: 'a'.repeat(33 * 1024),
        durationMinutes: 5,
      },
    }),
    400,
    'VALIDATION',
  );
  check(
    'a module with lessons cannot be deleted',
    await call('DELETE', `/courses/${courseId}/modules/${moduleA.id}`, {
      token: instructorToken,
    }),
    409,
    'MODULE_NOT_EMPTY',
  );
  check(
    'the instructor deletes a lesson of the draft',
    await call(
      'DELETE',
      `/courses/${courseId}/modules/${moduleA.id}/lessons/${l2}`,
      {
        token: instructorToken,
      },
    ),
    204,
  );
  const listed = await call('GET', '/instructor/courses', {
    token: instructorToken,
  });
  const count = listed.body?.items?.find(
    (item) => item.id === courseId,
  )?.lessonCount;
  check(
    'the course counts the lessons left',
    { status: count === 2 ? 200 : 500, body: listed.body },
    200,
  );
  check(
    'an empty module of the draft can be deleted',
    await call('DELETE', `/courses/${courseId}/modules/${moduleA.id}`, {
      token: instructorToken,
    }),
    204,
  );

  console.log('\n# Publish, catalog and course page (1.15)');
  const inCatalog = async (id) => {
    let cursor;

    for (let page = 0; page < 20; page++) {
      const query = cursor ? `?cursor=${cursor}` : '';
      const { body } = await call('GET', `/courses${query}`);

      const item = body?.items?.find((found) => found.id === id);

      if (item) {
        return item;
      }

      cursor = body?.nextCursor;

      if (!cursor) {
        return null;
      }
    }

    return null;
  };
  const emptyCourse = (
    await call('POST', '/courses', {
      token: instructorToken,
      body: { title: 'E2E empty course' },
    })
  ).body;
  check(
    'a course without lessons cannot be published',
    await call('POST', `/courses/${emptyCourse.id}/publish`, {
      token: instructorToken,
    }),
    409,
    'COURSE_EMPTY',
  );
  check(
    'a student cannot publish',
    await call('POST', `/courses/${courseId}/publish`, { token: learnerToken }),
    403,
    'FORBIDDEN',
  );
  check(
    'the instructor publishes the course',
    await call('POST', `/courses/${courseId}/publish`, {
      token: instructorToken,
    }),
    200,
  );
  check(
    'the published course is in the public catalog',
    { status: (await inCatalog(courseId)) ? 200 : 500 },
    200,
  );
  check(
    'the catalog shows the cover',
    {
      status:
        (await inCatalog(courseId))?.coverUrl?.['480'] === coverUrl?.['480']
          ? 200
          : 500,
    },
    200,
  );
  const publicPage = await call('GET', `/courses/${courseId}`);
  check('anyone opens the published course page', publicPage, 200);
  const indexed = await waitForIndex(courseId, 200);
  check(
    'the published course reaches the search index through the stream',
    indexed,
    200,
  );
  const { objectID, ...searched } = indexed.body;
  check(
    'the search record holds the searched fields of the current course only',
    {
      status:
        objectID === courseId &&
        Object.keys(searched).sort().join() ===
          'description,instructorName,publishedAt,title' &&
        searched.title === publicPage.body.title &&
        searched.description === publicPage.body.description
          ? 200
          : 500,
    },
    200,
  );
  const search = await call(
    'GET',
    `/search?q=${encodeURIComponent(publicPage.body.title)}&perPage=50`,
  );
  check('anyone searches the catalog without a token', search, 200);
  const hit = search.body?.items?.find((item) => item.id === courseId);
  check(
    'the search finds the course and answers it from the table',
    {
      status:
        hit?.title === publicPage.body.title &&
        hit.enrollmentCount === publicPage.body.enrollmentCount &&
        search.body.page === 0 &&
        search.body.totalItems >= 1
          ? 200
          : 500,
    },
    200,
  );
  check(
    'the public page and the search result show the cover',
    {
      status:
        publicPage.body?.coverUrl?.['480'] === coverUrl?.['480'] &&
        hit?.coverUrl?.['480'] === coverUrl?.['480']
          ? 200
          : 500,
    },
    200,
  );
  check(
    "another instructor cannot change a published course's cover",
    await call('POST', `/courses/${courseId}/cover`, {
      token: otherToken,
      body: { contentType: 'image/png' },
    }),
    403,
    'FORBIDDEN',
  );
  check(
    'a search without text is refused',
    await call('GET', '/search?q=%20'),
    400,
    'VALIDATION',
  );
  check(
    'the public page lists the outline without lesson bodies',
    {
      status:
        publicPage.body?.modules?.length === 1 &&
        !JSON.stringify(publicPage.body).includes('# Lesson')
          ? 200
          : 500,
      body: publicPage.body,
    },
    200,
  );
  check(
    'a draft has no public page',
    await call('GET', `/courses/${emptyCourse.id}`),
    404,
    'COURSE_NOT_FOUND',
  );
  check(
    'a lesson of a published course cannot be deleted',
    await call(
      'DELETE',
      `/courses/${courseId}/modules/${moduleB.id}/lessons/${l3}`,
      { token: instructorToken },
    ),
    409,
    'COURSE_PUBLISHED',
  );
  console.log('\n# Enrollment (2.1)');
  const enrollment = (token, method = 'PUT', id = courseId) =>
    call(method, `/courses/${id}/enrollment`, { token });
  const enrollmentCount = async () =>
    (await call('GET', `/courses/${courseId}`)).body?.enrollmentCount;
  const firstEnrollment = await enrollment(learnerToken);
  check('a student enrolls in the published course', firstEnrollment, 201);
  check(
    'enrolling again answers the same enrollment',
    await enrollment(learnerToken),
    200,
  );
  check(
    'the course counts one student',
    { status: (await enrollmentCount()) === 1 ? 200 : 500 },
    200,
  );
  check(
    'the owner cannot enroll in their own course',
    await enrollment(instructorToken),
    409,
    'OWN_COURSE',
  );
  check(
    'a draft takes no enrollment',
    await enrollment(learnerToken, 'PUT', emptyCourse.id),
    404,
    'COURSE_NOT_FOUND',
  );
  check(
    'leaving a course never joined answers not found',
    await enrollment(otherToken, 'DELETE'),
    404,
    'ENROLLMENT_NOT_FOUND',
  );
  await call('PATCH', '/me', {
    token: learnerToken,
    body: { name: 'E2E Renamed Learner' },
  });
  const { Item: stored } = aws(
    'dynamodb',
    'get-item',
    '--table-name',
    table,
    '--consistent-read',
    '--key',
    JSON.stringify({
      PK: { S: `ACCOUNT#${plainStudent.accountId}` },
      SK: { S: `ENROLLMENT#${courseId}` },
    }),
  );
  check(
    'a new name reaches the enrollment',
    { status: stored?.studentName?.S === 'E2E Renamed Learner' ? 200 : 500 },
    200,
  );
  check('the student leaves', await enrollment(learnerToken, 'DELETE'), 204);
  check(
    'leaving again answers the same',
    await enrollment(learnerToken, 'DELETE'),
    204,
  );
  check(
    'the course counts no student',
    { status: (await enrollmentCount()) === 0 ? 200 : 500 },
    200,
  );
  const again = await enrollment(learnerToken);
  check(
    'enrolling again keeps the first date',
    {
      status:
        again.status === 200 &&
        again.body?.enrolledAt === firstEnrollment.body?.enrolledAt
          ? 200
          : 500,
      body: again.body,
    },
    200,
  );

  console.log('\n# Enrollment lists (2.2)');
  // Both lists read a GSI, which is eventually consistent.
  const eventually = async (read, done) => {
    let last;

    for (let attempt = 0; attempt < 5; attempt++) {
      last = await read();

      if (done(last)) {
        return last;
      }

      await new Promise((resolve) => setTimeout(resolve, 400));
    }

    return last;
  };
  const myEnrollments = () =>
    call('GET', '/me/enrollments', { token: learnerToken });
  const students = (token) =>
    call('GET', `/courses/${courseId}/students`, { token });
  const myList = await eventually(myEnrollments, (r) =>
    r.body?.items?.some((item) => item.courseId === courseId),
  );
  check(
    'the student finds the course among their enrollments, with its title',
    {
      status: myList.body?.items?.some(
        (item) =>
          item.courseId === courseId &&
          item.title === publicPage.body?.title &&
          item.courseStatus === 'PUBLISHED',
      )
        ? 200
        : 500,
      body: myList.body,
    },
    200,
  );
  check(
    'the student sees the cover among their enrollments',
    {
      status:
        myList.body?.items?.find((item) => item.courseId === courseId)
          ?.coverUrl?.['480'] === coverUrl?.['480']
          ? 200
          : 500,
    },
    200,
  );
  const studentList = await eventually(
    () => students(instructorToken),
    (r) => r.body?.items?.length === 1,
  );
  check(
    'the owner lists the student with the copied name',
    {
      status:
        studentList.body?.items?.[0]?.accountId === plainStudent.accountId &&
        studentList.body?.items?.[0]?.studentName === 'E2E Renamed Learner'
          ? 200
          : 500,
      body: studentList.body,
    },
    200,
  );
  check(
    'an admin lists the students too',
    await students(adminTokens.accessToken),
    200,
  );
  check(
    'another instructor cannot list them',
    await students(otherToken),
    403,
    'FORBIDDEN',
  );
  check(
    'a student cannot list them',
    await students(learnerToken),
    403,
    'FORBIDDEN',
  );

  console.log('\n# Open a lesson (2.3)');
  const lessonPath = `/courses/${courseId}/lessons/${l1}`;
  const opened = await call('GET', lessonPath, { token: learnerToken });
  check(
    'an enrolled student opens a lesson with its body',
    {
      status:
        opened.status === 200 &&
        opened.body?.lessonId === l1 &&
        typeof opened.body?.body === 'string'
          ? 200
          : 500,
      body: opened.body,
    },
    200,
  );
  check(
    'an enrolled student sees the outline',
    await call('GET', outlinePath, { token: learnerToken }),
    200,
  );
  check(
    'someone not enrolled cannot open it',
    await call('GET', lessonPath, { token: otherToken }),
    403,
    'FORBIDDEN',
  );
  check(
    'the owner opens it too',
    await call('GET', lessonPath, { token: instructorToken }),
    200,
  );
  check(
    'a lesson id from nowhere is not found',
    await call('GET', `/courses/${courseId}/lessons/${emptyCourse.id}`, {
      token: instructorToken,
    }),
    404,
    'LESSON_NOT_FOUND',
  );

  console.log('\n# Lesson material (Q406 to Q412)');
  const materialPath = `${lessonPath}/attachments`;
  const requestMaterial = (contentType, fileName) =>
    call('POST', materialPath, {
      token: instructorToken,
      body: { contentType, fileName },
    });
  check(
    'material of another type is refused',
    await requestMaterial('image/gif', 'photo.gif'),
    400,
    'VALIDATION',
  );
  const pdfBytes = new TextEncoder().encode(
    '%PDF-1.4\n% e2e material\n%%EOF\n',
  );
  const pdfUpload = await requestMaterial(
    'application/pdf',
    'Aula 1 – slides.pdf',
  );
  check('the instructor asks to upload a PDF', pdfUpload, 201);
  check(
    'S3 takes the PDF through the signed POST',
    await postToS3(pdfUpload.body, pdfBytes, 'application/pdf'),
    204,
  );
  const txtUpload = await requestMaterial('text/plain', 'Notes.txt');
  await postToS3(
    txtUpload.body,
    new TextEncoder().encode('notes'),
    'text/plain',
  );
  const materialDeadline = Date.now() + 60_000;
  let materials = [];
  while (materials.length < 2 && Date.now() < materialDeadline) {
    materials =
      (await call('GET', lessonPath, { token: learnerToken })).body
        ?.attachments ?? [];
    if (materials.length < 2) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
  check(
    'the enrolled student sees both, in the order sent',
    {
      status:
        materials.map((item) => item.name).join('|') ===
        'Aula 1 – slides.pdf|Notes.txt'
          ? 200
          : 500,
    },
    200,
  );
  const pdfId = pdfUpload.body?.fileId;
  const download = await call('GET', `${materialPath}/${pdfId}`, {
    token: learnerToken,
  });
  check('the enrolled student gets a download URL', download, 200);
  // Without a URL the check below fails instead of the script.
  const downloaded = download.body?.url
    ? await fetch(download.body.url)
    : new Response(null, { status: 599 });
  const downloadedBytes = new Uint8Array(await downloaded.arrayBuffer());
  check(
    'the download has the same bytes and the name sent',
    {
      status:
        downloaded.status === 200 &&
        Buffer.from(downloadedBytes).equals(Buffer.from(pdfBytes)) &&
        downloaded.headers
          .get('content-disposition')
          ?.includes(encodeURIComponent('Aula 1 – slides.pdf'))
          ? 200
          : 500,
    },
    200,
  );
  check(
    'someone not enrolled cannot download it',
    await call('GET', `${materialPath}/${pdfId}`, { token: otherToken }),
    403,
    'FORBIDDEN',
  );
  const reordered = await call('PUT', `${materialPath}/order`, {
    token: instructorToken,
    body: { fileIds: [txtUpload.body?.fileId, pdfId] },
  });
  check(
    'the instructor reorders the material',
    {
      status:
        reordered.status === 200 &&
        reordered.body?.items?.map((item) => item.name).join('|') ===
          'Notes.txt|Aula 1 – slides.pdf'
          ? 200
          : 500,
    },
    200,
  );
  check(
    'the instructor deletes a material',
    await call('DELETE', `${materialPath}/${txtUpload.body?.fileId}`, {
      token: instructorToken,
    }),
    204,
  );
  const afterDelete =
    (await call('GET', lessonPath, { token: learnerToken })).body
      ?.attachments ?? [];
  check(
    'the deleted material leaves the lesson',
    {
      status:
        afterDelete.length === 1 && afterDelete[0]?.id === pdfId ? 200 : 500,
    },
    200,
  );

  console.log('\n# Lesson video (5.1, Q432 to Q447)');
  const videoPath = `${lessonPath}/video`;
  const videoKey = (fileId) => `lesson/${l1}/video/${fileId}/original`;
  const startVideo = (body, token = instructorToken) =>
    call('POST', videoPath, { token, body });
  const signParts = (fileId, partNumbers) =>
    call('POST', `${videoPath}/part-urls`, {
      token: instructorToken,
      body: { fileId, partNumbers },
    });
  // Each part as a browser sends it: a PUT of exactly its slice, keeping the ETag S3 returns.
  const putParts = async (urls, bytes, partSize) => {
    const parts = [];
    for (const { partNumber, url } of urls) {
      const start = (partNumber - 1) * partSize;
      const response = await fetch(url, {
        method: 'PUT',
        body: bytes.subarray(start, start + partSize),
      });
      parts.push({
        partNumber,
        eTag: response.headers.get('etag'),
        status: response.status,
      });
    }

    return parts;
  };
  const completeVideo = (fileId, parts) =>
    call('POST', `${videoPath}/complete`, {
      token: instructorToken,
      body: {
        fileId,
        parts: parts.map(({ partNumber, eTag }) => ({ partNumber, eTag })),
      },
    });
  check(
    'a video over 2 GiB is refused',
    await startVideo({ contentType: 'video/mp4', size: 2 * 1024 ** 3 + 1 }),
    400,
    'VALIDATION',
  );
  check(
    'a video that is not MP4 is refused',
    await startVideo({ contentType: 'video/webm', size: 1 }),
    400,
    'VALIDATION',
  );
  check(
    'another instructor cannot send a video',
    await startVideo({ contentType: 'video/mp4', size: 1 }, otherToken),
    403,
    'FORBIDDEN',
  );

  const videoBytes = randomBytes(20 * 1024 * 1024);
  const videoStart = await startVideo({
    contentType: 'video/mp4',
    size: videoBytes.length,
  });
  check(
    'the instructor opens a video upload of 2 parts of 16 MiB',
    {
      status:
        videoStart.status === 201 &&
        videoStart.body?.partCount === 2 &&
        videoStart.body?.partSize === 16 * 1024 * 1024
          ? 201
          : videoStart.status,
    },
    201,
  );
  const videoId = videoStart.body?.fileId;
  const videoUrls = await signParts(videoId, [1, 2]);
  check('the parts get one signed URL each', videoUrls, 200);
  const videoParts = await putParts(
    videoUrls.body?.urls ?? [],
    videoBytes,
    16 * 1024 * 1024,
  );
  check(
    'S3 takes both parts through their URLs',
    {
      status:
        videoParts.length === 2 &&
        videoParts.every((part) => part.status === 200 && part.eTag)
          ? 200
          : 500,
    },
    200,
  );
  check(
    'a list that leaves out a part is refused',
    await completeVideo(videoId, videoParts.slice(0, 1)),
    400,
    'VIDEO_PARTS_INVALID',
  );
  check(
    'the instructor completes the upload',
    await completeVideo(videoId, videoParts),
    201,
  );
  const confirmed = await waitForVideo(l1, videoId);
  check(
    'processUpload confirms the video with its real size, and the object is in the bucket',
    {
      status:
        confirmed?.status?.S === 'UPLOADED' &&
        confirmed?.size?.N === String(videoBytes.length) &&
        isInBucket(privateBucket, videoKey(videoId))
          ? 200
          : 500,
    },
    200,
  );
  check(
    'completing again after the confirmation answers the same',
    await completeVideo(videoId, videoParts),
    201,
  );

  const abandoned = await startVideo({
    contentType: 'video/mp4',
    size: 1024,
  });
  const abandonedId = abandoned.body?.fileId;
  const abandonedUpload = fileItem(`LESSON#${l1}`, `FILE#video#${abandonedId}`)
    ?.uploadId?.S;
  const abandonedUrls = await signParts(abandonedId, [1]);
  await putParts(abandonedUrls.body?.urls ?? [], randomBytes(1024), 1024);
  check(
    'the instructor aborts an upload',
    await call('POST', `${videoPath}/abort`, {
      token: instructorToken,
      body: { fileId: abandonedId },
    }),
    204,
  );
  check(
    'the aborted upload keeps no part and no record',
    {
      status:
        uploadIsGone(videoKey(abandonedId), abandonedUpload) &&
        !fileItem(`LESSON#${l1}`, `FILE#video#${abandonedId}`)
          ? 200
          : 500,
    },
    200,
  );

  const newVideoBytes = randomBytes(1024 * 1024);
  const newVideo = await startVideo({
    contentType: 'video/mp4',
    size: newVideoBytes.length,
  });
  const newVideoId = newVideo.body?.fileId;
  const newVideoUrls = await signParts(newVideoId, [1]);
  const newVideoParts = await putParts(
    newVideoUrls.body?.urls ?? [],
    newVideoBytes,
    16 * 1024 * 1024,
  );
  await completeVideo(newVideoId, newVideoParts);
  const replaced = await waitForVideo(l1, newVideoId);
  // The old video goes right after the new one is confirmed.
  const replaceDeadline = Date.now() + 30_000;
  while (
    isInBucket(privateBucket, videoKey(videoId)) &&
    Date.now() < replaceDeadline
  ) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  check(
    'a new video replaces the old one, record and object',
    {
      status:
        replaced?.status?.S === 'UPLOADED' &&
        !fileItem(`LESSON#${l1}`, `FILE#video#${videoId}`) &&
        !isInBucket(privateBucket, videoKey(videoId))
          ? 200
          : 500,
    },
    200,
  );

  console.log('\n# Watching and deleting the video (5.2, Q449 to Q454)');
  const openedWithVideo = await call('GET', lessonPath, {
    token: learnerToken,
  });
  const playback = openedWithVideo.body?.video;
  check(
    'the student opens the lesson with the video, apart from the material',
    {
      status:
        openedWithVideo.status === 200 &&
        playback?.url &&
        !(openedWithVideo.body?.attachments ?? []).some(
          (item) => item.id === newVideoId,
        )
          ? 200
          : 500,
    },
    200,
  );
  console.log(`     the playback URL lasts ${String(playback?.expiresIn)} s`);
  check(
    'the URL lasts up to two hours',
    {
      status:
        playback?.expiresIn > 0 && playback?.expiresIn <= 7200 ? 200 : 500,
    },
    200,
  );
  const ranged = playback?.url
    ? await fetch(playback.url, { headers: { Range: 'bytes=0-1023' } })
    : undefined;
  const rangedBytes = ranged
    ? new Uint8Array(await ranged.arrayBuffer())
    : new Uint8Array();
  check(
    'the player reads a range of the video: 206, video/mp4, the same bytes',
    {
      status:
        ranged?.status === 206 &&
        ranged.headers.get('content-type') === 'video/mp4' &&
        Buffer.compare(
          Buffer.from(rangedBytes),
          newVideoBytes.subarray(0, 1024),
        ) === 0
          ? 206
          : (ranged?.status ?? 500),
    },
    206,
  );
  check(
    'another instructor cannot delete the video',
    await call('DELETE', videoPath, { token: otherToken }),
    403,
    'FORBIDDEN',
  );
  check(
    'the instructor deletes the video',
    await call('DELETE', videoPath, { token: instructorToken }),
    204,
  );
  const afterVideoDelete = await call('GET', lessonPath, {
    token: learnerToken,
  });
  check(
    'the lesson opens without the video, and its object leaves the bucket',
    {
      status:
        afterVideoDelete.status === 200 &&
        !afterVideoDelete.body?.video &&
        !isInBucket(privateBucket, videoKey(newVideoId))
          ? 200
          : 500,
    },
    200,
  );
  check(
    'deleting it again finds no video',
    await call('DELETE', videoPath, { token: instructorToken }),
    404,
    'VIDEO_NOT_FOUND',
  );

  console.log('\n# Progress (2.4)');
  const completion = (lessonId, token = learnerToken) =>
    call('PUT', `/courses/${courseId}/lessons/${lessonId}/completion`, {
      token,
    });
  check('the student completes a lesson', await completion(l1), 201);
  check('completing it again answers the same', await completion(l1), 200);
  check(
    'the owner has no progress to record',
    await completion(l1, instructorToken),
    403,
    'FORBIDDEN',
  );
  check(
    'the student saves where they stopped',
    await call('PUT', `/courses/${courseId}/position`, {
      token: learnerToken,
      body: { lessonId: l3, positionSeconds: 42 },
    }),
    204,
  );
  check(
    'a negative position is refused',
    await call('PUT', `/courses/${courseId}/position`, {
      token: learnerToken,
      body: { lessonId: l3, positionSeconds: -1 },
    }),
    400,
    'VALIDATION',
  );
  const progress = await call('GET', `/courses/${courseId}/progress`, {
    token: learnerToken,
  });
  check(
    'the progress counts the lesson and resumes at the position',
    {
      status:
        progress.body?.completedLessons === 1 &&
        progress.body?.completedLessonIds?.includes(l1) &&
        progress.body?.lastLessonId === l3 &&
        progress.body?.positionSeconds === 42
          ? 200
          : 500,
      body: progress.body,
    },
    200,
  );

  console.log('\n# Student CSV (4.5, Q423 to Q430)');
  const adminToken = adminTokens.accessToken;
  check('a second student enrolls', await enrollment(adminToken), 201);
  const requested = await call('POST', `/courses/${courseId}/exports`, {
    token: instructorToken,
  });
  check('the owner asks for the student CSV', requested, 202);
  check(
    'a second request waits for the first',
    await call('POST', `/courses/${courseId}/exports`, {
      token: instructorToken,
    }),
    409,
    'EXPORT_PENDING',
  );
  const exportPath = `/exports/${requested.body?.id}`;
  const exportDeadline = Date.now() + 60_000;
  let exported = await call('GET', exportPath, { token: instructorToken });
  while (exported.body?.status === 'PENDING' && Date.now() < exportDeadline) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    exported = await call('GET', exportPath, { token: instructorToken });
  }
  check(
    'the job writes it and the export turns READY with a link',
    {
      status:
        exported.body?.status === 'READY' &&
        exported.body?.rowCount === 2 &&
        exported.body?.downloadUrl
          ? 200
          : 500,
      body: exported.body,
    },
    200,
  );
  const csvResponse = exported.body?.downloadUrl
    ? await fetch(exported.body.downloadUrl)
    : undefined;
  const csv = csvResponse ? await csvResponse.text() : '';
  const exportedLessons = (
    await call('GET', '/instructor/courses', { token: instructorToken })
  ).body?.items?.find((item) => item.id === courseId)?.lessonCount;
  const rows = csv
    .replace(/^\uFEFF/, '')
    .trim()
    .split('\r\n');
  const learnerRow = rows.find((row) => /,1,\d+$/.test(row));
  check(
    'the CSV has the header, both students, the progress and no e-mail',
    {
      status:
        rows[0] === 'name,enrolledAt,completedLessons,progress' &&
        rows.length === 3 &&
        learnerRow?.endsWith(`,1,${Math.round(100 / exportedLessons)}`) &&
        rows.some((row) => row.endsWith(',0,0')) &&
        !csv.includes('@')
          ? 200
          : 500,
      body: { rows, exportedLessons },
    },
    200,
  );
  check(
    'another instructor cannot see the export',
    await call('GET', exportPath, { token: otherToken }),
    404,
    'EXPORT_NOT_FOUND',
  );
  check(
    'the CSV sits under the course in the private bucket',
    {
      status: isInBucket(
        privateBucket,
        `exports/${courseId}/${requested.body?.id}.csv`,
      )
        ? 200
        : 500,
    },
    200,
  );
  check(
    'the second student leaves again',
    await enrollment(adminToken, 'DELETE'),
    204,
  );

  console.log('\n# Reviews (2.5)');
  const reviewPath = `/courses/${courseId}/review`;
  check(
    'the student reviews the course',
    await call('PUT', reviewPath, {
      token: learnerToken,
      body: { rating: 4, comment: 'Good' },
    }),
    201,
  );
  check(
    'the student edits the review',
    await call('PUT', reviewPath, {
      token: learnerToken,
      body: { rating: 5, comment: 'Great' },
    }),
    200,
  );
  check(
    'a rating of 6 is refused',
    await call('PUT', reviewPath, {
      token: learnerToken,
      body: { rating: 6 },
    }),
    400,
    'VALIDATION',
  );
  check(
    'the owner cannot review their own course',
    await call('PUT', reviewPath, {
      token: instructorToken,
      body: { rating: 5 },
    }),
    403,
    'FORBIDDEN',
  );
  const myReview = await call('GET', reviewPath, { token: learnerToken });
  check(
    'the student reads their review',
    { status: myReview.body?.rating === 5 ? 200 : 500, body: myReview.body },
    200,
  );
  const publicReviews = await eventually(
    () => call('GET', `/courses/${courseId}/reviews`),
    (r) => r.body?.items?.length === 1,
  );
  check(
    'anyone reads the reviews, with the copied name and no account id',
    {
      status:
        publicReviews.body?.items?.[0]?.studentName === 'E2E Renamed Learner' &&
        publicReviews.body?.items?.[0]?.rating === 5 &&
        !('accountId' in (publicReviews.body?.items?.[0] ?? {}))
          ? 200
          : 500,
      body: publicReviews.body,
    },
    200,
  );
  const rated = await call('GET', `/courses/${courseId}`);
  check(
    'the course page shows the rating average',
    {
      status:
        rated.body?.ratingCount === 1 && rated.body?.ratingAverage === 5
          ? 200
          : 500,
      body: rated.body,
    },
    200,
  );

  console.log('\n# Archive (1.15, Q52)');
  check(
    'the instructor archives the course',
    await call('POST', `/courses/${courseId}/archive`, {
      token: instructorToken,
    }),
    200,
  );
  // Before the student leaves below, which would rightly skip the notice.
  const notice = await waitForMail(
    plainStudent.accountId,
    `MAIL#course-archived#${courseId}`,
  );
  check(
    'an enrolled student is told by e-mail that the course was archived',
    { status: notice?.status?.S === 'SENT' ? 200 : 500 },
    200,
  );
  const ownerNotice = aws(
    'dynamodb',
    'get-item',
    '--table-name',
    table,
    '--consistent-read',
    '--key',
    JSON.stringify({
      PK: { S: `ACCOUNT#${student.accountId}` },
      SK: { S: `MAIL#course-archived#${courseId}` },
    }),
  )?.Item;
  check(
    'the instructor who archived it gets no notice',
    { status: ownerNotice ? 500 : 200 },
    200,
  );
  check(
    'an archived course takes no new enrollment',
    await enrollment(otherToken),
    409,
    'COURSE_ARCHIVED',
  );
  check(
    'the owner still lists the students of an archived course',
    await students(instructorToken),
    200,
  );
  check(
    'an enrolled student still opens a lesson of the archived course',
    await call('GET', lessonPath, { token: learnerToken }),
    200,
  );
  check(
    'and still sees its outline',
    await call('GET', outlinePath, { token: learnerToken }),
    200,
  );
  check('and still records progress there', await completion(l3), 201);
  check(
    'an archived course has no public reviews',
    await call('GET', `/courses/${courseId}/reviews`),
    404,
    'COURSE_NOT_FOUND',
  );
  check(
    'an enrolled student can still leave an archived course',
    await enrollment(learnerToken, 'DELETE'),
    204,
  );
  check(
    'the archived course leaves the catalog',
    { status: (await inCatalog(courseId)) ? 500 : 200 },
    200,
  );
  check(
    'the archived course leaves the search index',
    await waitForIndex(courseId, 404),
    404,
  );
  const afterArchive = await call(
    'GET',
    `/search?q=${encodeURIComponent(publicPage.body.title)}&perPage=50`,
  );
  check(
    'the archived course is no longer found by the search',
    {
      status: afterArchive.body?.items?.some((item) => item.id === courseId)
        ? 500
        : 200,
    },
    200,
  );
  check(
    'the archived course has no public page',
    await call('GET', `/courses/${courseId}`),
    404,
    'COURSE_NOT_FOUND',
  );
  check(
    'an archived course takes no new cover',
    await call('POST', `/courses/${courseId}/cover`, {
      token: instructorToken,
      body: { contentType: 'image/png' },
    }),
    409,
    'COURSE_ARCHIVED',
  );
  check(
    'an archived course takes no new video',
    await call('POST', `/courses/${courseId}/lessons/${l1}/video`, {
      token: instructorToken,
      body: { contentType: 'video/mp4', size: 1 },
    }),
    409,
    'COURSE_ARCHIVED',
  );
  check(
    'an archived course cannot be edited',
    await call('PATCH', `/courses/${courseId}`, {
      token: instructorToken,
      body: { title: 'After archive' },
    }),
    409,
    'COURSE_ARCHIVED',
  );

  console.log('\n# Delete a draft (3.7, Q368 to Q373)');
  const draft = (
    await call('POST', '/courses', {
      token: instructorToken,
      body: { title: 'E2E draft to delete', description: 'Goes away' },
    })
  ).body;
  const draftModule = (
    await call('POST', `/courses/${draft.id}/modules`, {
      token: instructorToken,
      body: { title: 'Module' },
    })
  ).body;
  const draftLesson = (
    await call(
      'POST',
      `/courses/${draft.id}/modules/${draftModule.id}/lessons`,
      {
        token: instructorToken,
        body: { title: 'Lesson', body: '# Lesson', durationMinutes: 5 },
      },
    )
  ).body;

  console.log('\n# Files go with their lesson or draft (4.4, Q416 to Q420)');
  const draftPdf = new TextEncoder().encode('%PDF-1.4\n% e2e draft\n%%EOF\n');
  const sendPdf = async (lessonId) => {
    const upload = await call(
      'POST',
      `/courses/${draft.id}/lessons/${lessonId}/attachments`,
      {
        token: instructorToken,
        body: { contentType: 'application/pdf', fileName: 'Slides.pdf' },
      },
    );
    // A refused request fails the check, not the script.
    if (upload.status !== 201) {
      return false;
    }

    await postToS3(upload.body, draftPdf, 'application/pdf');

    return waitForFile(`LESSON#${lessonId}`, 'attachment', 'UPLOADED');
  };
  const doomedLesson = (
    await call(
      'POST',
      `/courses/${draft.id}/modules/${draftModule.id}/lessons`,
      {
        token: instructorToken,
        body: { title: 'Doomed', body: '# Doomed', durationMinutes: 5 },
      },
    )
  ).body;
  check(
    'a draft lesson gets a PDF',
    { status: (await sendPdf(doomedLesson.id)) ? 200 : 500 },
    200,
  );
  check(
    'the owner deletes that lesson',
    await call(
      'DELETE',
      `/courses/${draft.id}/modules/${draftModule.id}/lessons/${doomedLesson.id}`,
      { token: instructorToken },
    ),
    204,
  );
  check(
    'its partition and its objects go in the same request',
    {
      status:
        partitionOf(`LESSON#${doomedLesson.id}`).length === 0 &&
        prefixIsEmpty(privateBucket, `lesson/${doomedLesson.id}/`)
          ? 200
          : 500,
    },
    200,
  );
  check(
    'the remaining lesson of the draft gets a PDF',
    { status: (await sendPdf(draftLesson.id)) ? 200 : 500 },
    200,
  );
  const draftCover = await call('POST', `/courses/${draft.id}/cover`, {
    token: instructorToken,
    body: { contentType: 'image/jpeg' },
  });
  if (draftCover.status === 201) {
    await postToS3(draftCover.body, coverPhoto, 'image/jpeg');
  }
  check(
    'the draft gets a cover with its variants',
    {
      status:
        draftCover.status === 201 &&
        (await waitForFile(`COURSE#${draft.id}`, 'cover', 'PROCESSED')) &&
        !prefixIsEmpty(publicBucket, `course/${draft.id}/`)
          ? 200
          : 500,
    },
    200,
  );
  check(
    'the owner deletes a draft and is answered at once',
    await call('DELETE', `/courses/${draft.id}`, { token: instructorToken }),
    202,
  );
  check(
    'the deleted draft is gone for the API at once',
    await call('GET', `/courses/${draft.id}/outline`, {
      token: instructorToken,
    }),
    404,
    'COURSE_NOT_FOUND',
  );
  const stillMine = await call('GET', '/instructor/courses?limit=100', {
    token: instructorToken,
  });
  check(
    'the deleted draft leaves the instructor list at once',
    {
      status: stillMine.body?.items?.some((item) => item.id === draft.id)
        ? 500
        : 200,
    },
    200,
  );
  check(
    'deleting it again finds no course',
    await call('DELETE', `/courses/${draft.id}`, { token: instructorToken }),
    404,
    'COURSE_NOT_FOUND',
  );
  const leftOf = () => [
    ...(aws(
      'dynamodb',
      'query',
      '--table-name',
      table,
      '--consistent-read',
      '--key-condition-expression',
      'PK = :pk',
      '--expression-attribute-values',
      JSON.stringify({ ':pk': { S: `COURSE#${draft.id}` } }),
      '--projection-expression',
      'SK',
    )?.Items ?? []),
    ...partitionOf(`LESSON#${draftLesson.id}`).map((item) => item.SK.S),
    ...[
      [privateBucket, `course/${draft.id}/`],
      [publicBucket, `course/${draft.id}/`],
      [privateBucket, `lesson/${draftLesson.id}/`],
    ]
      .filter(([bucket, prefix]) => !prefixIsEmpty(bucket, prefix))
      .map(([bucket, prefix]) => `${bucket}/${prefix}`),
  ];
  const deletionDeadline = Date.now() + 60_000;
  let left = leftOf();

  while (left.length > 0 && Date.now() < deletionDeadline) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    left = leftOf();
  }

  check(
    'the job deletes the course, its module and lesson, the lesson partition and every object in both buckets',
    { status: left.length === 0 ? 200 : 500 },
    200,
  );
  check(
    'a course that is not a draft cannot be deleted',
    await call('DELETE', `/courses/${courseId}`, { token: instructorToken }),
    409,
    'COURSE_NOT_DRAFT',
  );

  console.log('\n# Disable and enable (Q193, Q212)');
  check(
    'admin disables the student',
    await call('POST', `/admin/users/${student.accountId}/disable`, {
      token: adminTokens.accessToken,
    }),
    200,
  );
  check(
    'the disabled student is refused at once',
    await me(third.accessToken),
    403,
    'ACCOUNT_UNAVAILABLE',
  );
  check(
    'the disabled student cannot sign in',
    await signIn(student),
    403,
    'ACCOUNT_UNAVAILABLE',
  );
  check(
    'the disabled student cannot refresh',
    await refresh(third.refreshToken),
    403,
    'ACCOUNT_UNAVAILABLE',
  );
  check(
    'admin enables the student',
    await call('POST', `/admin/users/${student.accountId}/enable`, {
      token: adminTokens.accessToken,
    }),
    200,
  );
  check(
    'the session from before the disable stays ended',
    await me(third.accessToken),
    401,
    'INVALID_SESSION',
  );
  const lastSession = await signIn(student);
  check('the enabled student signs in again', lastSession, 200);

  console.log('\n# Sign-out (6.1, Q483, Q488)');
  const signedOut = await call('POST', '/auth/sign-out', {
    token: lastSession.body?.accessToken,
    headers: {
      cookie: `${sessionCookieName}=${lastSession.body?.refreshToken}`,
    },
  });
  check('the student signs out', signedOut, 204);
  check(
    'sign-out clears the cookie',
    {
      status: signedOut.setCookies.some(
        (cookie) =>
          cookie.startsWith(`${sessionCookieName}=;`) &&
          cookie.includes('Max-Age=0'),
      )
        ? 200
        : 500,
    },
    200,
  );
  check(
    'the access token from before the sign-out is refused at once',
    await me(lastSession.body?.accessToken),
    401,
    'INVALID_SESSION',
  );
  check(
    'the revoked refresh token no longer works',
    await refresh(lastSession.body?.refreshToken),
    401,
    'INVALID_SESSION',
  );

  console.log('\n# Browser access (6.1, Q484, Q486)');
  const preflight = (origin) =>
    fetch(`${baseUrl}/me`, {
      method: 'OPTIONS',
      headers: {
        origin,
        'access-control-request-method': 'GET',
        'access-control-request-headers': 'authorization',
      },
    });
  const fromSite = await preflight(siteOrigin);
  check(
    "the API lets the site's pages call it with credentials",
    {
      status:
        fromSite.headers.get('access-control-allow-origin') === siteOrigin &&
        fromSite.headers.get('access-control-allow-credentials') === 'true'
          ? 200
          : 500,
    },
    200,
  );
  const fromElsewhere = await preflight('https://elsewhere.joaodevdude.com');
  check(
    'the API gives no other origin access',
    {
      status: fromElsewhere.headers.get('access-control-allow-origin')
        ? 500
        : 200,
    },
    200,
  );
  const site = await fetch(siteOrigin, { redirect: 'manual' });
  check(
    "the site's domain answers over TLS through CloudFront",
    {
      status:
        site.status < 500 && /cloudfront/i.test(site.headers.get('via') ?? '')
          ? 200
          : 500,
    },
    200,
  );

  console.log(
    '\nNot covered here: the password reset needs the code sent by e-mail.',
  );
} finally {
  await cleanUp();
}

console.log(
  failures ? `\n${failures} check(s) failed.` : '\nAll checks passed.',
);
process.exit(failures ? 1 : 0);
