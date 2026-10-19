// Calls the deployed dev API as real clients do, with throwaway accounts that it
// creates, confirms and deletes itself: no mailbox, no token pasted by hand.
// Needs the project's AWS credentials (AWS_PROFILE in .env).
import { execFileSync } from 'node:child_process';
import { createHmac, randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

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
    { encoding: 'utf8' },
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

async function call(method, path, { token, body } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();

  return { status: response.status, body: text ? JSON.parse(text) : undefined };
}

// The search index is read with the search-only key, as the search route will (Q303, Q319).
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

// The index follows the table through the stream and a queue, seconds behind.
async function waitForIndex(courseId, status) {
  const deadline = Date.now() + 60_000;
  let record = await indexRecord(courseId);

  while (record.status !== status && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    record = await indexRecord(courseId);
  }

  return record;
}

// The welcome e-mail follows the confirmation through the stream and the mail queue (Q349, Q354).
async function waitForWelcome(accountId) {
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
        SK: { S: 'MAIL#welcome' },
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
  // writes (Q139): the account ACTIVE and both items without expiresAt.
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

const signIn = (account) =>
  call('POST', '/auth/sign-in', {
    body: { email: account.email, password: account.password },
  });

const refresh = (refreshToken) =>
  call('POST', '/auth/refresh', { body: { refreshToken } });

const me = (token) => call('GET', '/me', { token });

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

      return inside.flatMap((item) =>
        item.type?.S === 'Lesson'
          ? [
              { PK: item.PK, SK: item.SK },
              { PK: { S: `LESSON#${item.id.S}` }, SK: { S: 'CONTENT' } },
            ]
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
  const welcome = await waitForWelcome(student.accountId);
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
  const third = (await refresh(second.refreshToken)).body;
  check(
    'a refresh ends the access token before it',
    await me(second.accessToken),
    401,
    'INVALID_SESSION',
  );
  check('the refreshed access token works', await me(third.accessToken), 200);

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
  // An id token straight from Cognito: the app never hands one out (Q147).
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

      if (body?.items?.some((item) => item.id === id)) {
        return true;
      }

      cursor = body?.nextCursor;

      if (!cursor) {
        return false;
      }
    }

    return false;
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
  // Both lists read a GSI, which is eventually consistent (Q268).
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
    'an archived course cannot be edited',
    await call('PATCH', `/courses/${courseId}`, {
      token: instructorToken,
      body: { title: 'After archive' },
    }),
    409,
    'COURSE_ARCHIVED',
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
  check('the enabled student signs in again', await signIn(student), 200);

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
