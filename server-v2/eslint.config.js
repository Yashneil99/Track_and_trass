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
    // Command-line tools talk to a person at a terminal, so console output is their job.
    files: ['src/migrations/cli.js', 'src/seeds/cli.js'],
    rules: { 'no-console': 'off' },
  },
  {
    files: ['tests/**/*.js', '**/*.test.js'],
    languageOptions: { globals: { ...globals.jest } },
  },
];
