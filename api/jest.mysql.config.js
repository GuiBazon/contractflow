module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/mysql/**/*.test.js'],
  setupFiles: ['<rootDir>/tests/mysql/setup.js'],
  testTimeout: 30000,
  verbose: true,
};
