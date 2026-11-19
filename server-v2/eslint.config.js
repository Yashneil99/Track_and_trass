const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  { ignores: ['node_modules/', 'coverage/', 'logs/', 'uploads/'] },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      eqeqeq: 'error',
      'no-console': 'error',
      'prefer-const': 'error',
    },
  },
  {
    files: ['tests/**/*.js', '**/*.test.js'],
    languageOptions: { globals: { ...globals.jest } },
  },
];
