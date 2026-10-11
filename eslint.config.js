// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import globals from 'globals';

const domGlobals = [
  'window',
  'document',
  'navigator',
  'localStorage',
  'sessionStorage',
  'location',
  'HTMLElement',
];

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/coverage/**',
      '**/test-results/**',
      '**/playwright-report/**',
      'fixtures/**',
      'patches/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      '@typescript-eslint/switch-exhaustiveness-check': [
        'error',
        { considerDefaultExhaustiveForUnions: true },
      ],
      eqeqeq: ['error', 'always'],
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: ['**/*.js'],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    files: ['apps/web/public/**/*.js'],
    languageOptions: { globals: globals.browser, sourceType: 'script' },
  },
  {
    files: ['packages/core/src/**/*.ts'],
    rules: {
      'no-restricted-globals': [
        'error',
        ...domGlobals.map(name => ({
          name,
          message: '@opentabz/core is zero-DOM: it runs in workers and Node.',
        })),
        { name: 'process', message: '@opentabz/core must not depend on Node globals.' },
        { name: 'Buffer', message: '@opentabz/core must not depend on Node globals.' },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['node:*', 'react', 'react-dom', '@opentabz/ui', '@opentabz/web'],
              message: 'Not allowed in @opentabz/core.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['packages/ui/src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@coderline/alphatab', '@opentabz/core', '@opentabz/web'],
              message: '@opentabz/ui is a pure design system.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['apps/web/src/**/*.{ts,tsx}'],
    ignores: ['apps/web/src/**/*.worker.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: ['@coderline/alphatab', '@opentabz/core', '@opentabz/audio'].map(name => ({
            name,
            allowTypeImports: true,
            message:
              'The main thread never loads the engine at runtime (ADR-0004, ADR-0015). Use @opentabz/core/shared, @opentabz/audio/protocol or @opentabz/audio/ring, or talk to a worker.',
          })),
        },
      ],
    },
  },
  {
    files: ['**/*.{tsx,jsx}'],
    plugins: { 'react-hooks': reactHooks, 'jsx-a11y': jsxA11y },
    languageOptions: { globals: globals.browser },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.flatConfigs.strict.rules,
      // Scrollable regions must be keyboard-focusable (WCAG 2.1.1); role="region" marks them.
      'jsx-a11y/no-noninteractive-tabindex': ['error', { roles: ['region'], tags: [] }],
    },
  },
  {
    files: [
      '**/test/**/*.{ts,tsx}',
      '**/*.test.{ts,tsx}',
      '**/e2e/**/*.ts',
      'scripts/**/*.ts',
      '*.config.{ts,js}',
      '**/*.config.{ts,js}',
    ],
    languageOptions: { globals: globals.node },
    rules: {
      'no-restricted-globals': 'off',
      'no-restricted-imports': 'off',
      'no-console': 'off',
    },
  },
);
