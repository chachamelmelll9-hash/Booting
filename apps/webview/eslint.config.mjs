import baseConfig from '../../eslint.config.mjs';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
  ...baseConfig,
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: {
      'react-refresh': reactRefresh,
    },
    rules: {
      // Vite HMR: ensure components are exported correctly for fast refresh
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],

      // Web security
      'react/jsx-no-target-blank': 'error',
      'react/no-danger': 'warn',
      'no-eval': 'error',

      // Code quality
      'react/no-unstable-nested-components': 'error',
      'react/self-closing-comp': 'warn',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],

      // TypeScript handles path alias resolution
      'import/no-unresolved': 'off',
    },
  },
  {
    ignores: ['dist', '**/out-tsc'],
  },
];
