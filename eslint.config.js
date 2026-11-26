import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      '.tmp-e2e-dist/**',
      '.tmp-sim-dist/**',
      'node_modules/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      '.agent/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked.map((cfg) => ({
    ...cfg,
    files: ['**/*.ts'],
  })),
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['eslint.config.js', 'scripts/**/*.mjs', 'ops/**/*.mjs'],
    languageOptions: {
      globals: {
        console: 'readonly',
      },
    },
  },
);
