import { fixupPluginRules } from '@eslint/compat';
import expoConfig from 'eslint-config-expo/flat.js';
import prettierConfig from 'eslint-config-prettier';
import reactNativePlugin from 'eslint-plugin-react-native';
import reactNativeA11y from 'eslint-plugin-react-native-a11y';
import reactPerf from 'eslint-plugin-react-perf';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import unusedImports from 'eslint-plugin-unused-imports';

export default [
  // Base: Expo official config (react, hooks, TS, import, expo rules)
  ...expoConfig,

  // React Native specific rules (via compat - no native flat config)
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    plugins: {
      'react-native': fixupPluginRules(reactNativePlugin),
    },
    rules: {
      'react-native/no-unused-styles': 'error',
      'react-native/no-inline-styles': 'warn',
      'react-native/no-color-literals': 'warn',
    },
  },

  // Performance rules
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.jsx'],
    plugins: {
      'react-perf': reactPerf,
    },
    rules: {
      'react-perf/jsx-no-new-object-as-prop': 'warn',
      'react-perf/jsx-no-new-array-as-prop': 'warn',
      'react-perf/jsx-no-new-function-as-prop': 'warn',
    },
  },

  // Accessibility (via compat)
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.jsx'],
    plugins: {
      'react-native-a11y': fixupPluginRules(reactNativeA11y),
    },
    rules: {
      'react-native-a11y/has-valid-accessibility-role': 'warn',
      'react-native-a11y/has-valid-accessibility-state': 'warn',
      'react-native-a11y/has-valid-accessibility-actions': 'warn',
      'react-native-a11y/no-nested-touchables': 'warn',
      'react-native-a11y/has-valid-accessibility-descriptors': 'warn',
      'react-native-a11y/has-accessibility-props': 'warn',
      'react-native-a11y/has-valid-accessibility-value': 'warn',
      'react-native-a11y/has-accessibility-hint': 'warn',
      'react-native-a11y/has-valid-accessibility-live-region': 'warn',
      'react-native-a11y/has-valid-important-for-accessibility': 'warn',
    },
  },

  // Import sorting & unused imports
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    plugins: {
      'simple-import-sort': simpleImportSort,
      'unused-imports': unusedImports,
    },
    rules: {
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      'unused-imports/no-unused-imports': 'error',
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],
    },
  },

  // Additional rules
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      'react/no-unstable-nested-components': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      'no-eval': 'error',
      // TypeScript handles path alias resolution; ESLint resolver can't resolve @features/* etc.
      'import/no-unresolved': 'off',
    },
  },

  // Type-checked rules
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': [
        'warn',
        { ignoreVoid: true, ignoreIIFE: true },
      ],
      '@typescript-eslint/no-misused-promises': [
        'warn',
        { checksVoidReturn: { attributes: false } },
      ],
    },
  },

  // Prettier must be last
  prettierConfig,

  // Ignores
  {
    ignores: [
      '.expo',
      'web-build',
      'cache',
      'dist',
      '**/out-tsc',
      'android',
      'ios',
    ],
  },
];
