import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import prettier from 'eslint-config-prettier/flat';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const forbiddenImports = {
  shared: ['application', 'infra', 'main'],
  application: ['infra', 'main'],
  infra: ['main'],
};

const layerRules = Object.entries(forbiddenImports).map(
  ([layer, forbidden]) => ({
    files: [`src/${layer}/**/*.{ts,tsx}`],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: forbidden.map((target) => ({
            group: [`@${target}/*`],
            message: `The ${layer} layer must not import from ${target}.`,
          })),
        },
      ],
    },
  }),
);

export default defineConfig([
  { ignores: ['node_modules/', '.serverless/'] },
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: { 'simple-import-sort': simpleImportSort },
    rules: {
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            ['^\\u0000'],
            ['^node:'],
            ['^@?\\w'],
            ['^@tests/'],
            ['^@(application|infra|main|shared)/'],
            ['^\\.'],
          ],
        },
      ],
      'simple-import-sort/exports': 'error',
      '@typescript-eslint/no-namespace': 'off',
      eqeqeq: ['error', 'always'],
      curly: ['error', 'all'],
      // Ports declare members as properties so parameters are checked strictly.
      '@typescript-eslint/method-signature-style': ['error', 'property'],
    },
  },
  {
    files: ['**/*.js'],
    extends: [tseslint.configs.disableTypeChecked],
  },
  ...layerRules,
  prettier,
]);
