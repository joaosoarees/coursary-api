import path from 'node:path';

import { defineConfig } from 'vitest/config';

const src = (folder: string) =>
  path.resolve(import.meta.dirname, 'src', folder);

export default defineConfig({
  resolve: {
    alias: {
      '@application': src('application'),
      '@infra': src('infra'),
      '@main': src('main'),
      '@shared': src('shared'),
      '@tests': path.resolve(import.meta.dirname, '__tests__'),
    },
  },
  test: {
    clearMocks: true,
    restoreMocks: true,
    projects: [
      {
        extends: true,
        test: { name: 'unit', include: ['src/**/*.spec.ts'] },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          include: ['src/**/*.test.ts'],
          globalSetup: ['./__tests__/support/dynamodbGlobalSetup.ts'],
        },
      },
    ],
  },
});
