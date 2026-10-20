module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage/mysql',
  coverageReporters: ['text-summary', 'lcov', 'json'],
  collectCoverageFrom: require('./jest.config').collectCoverageFrom,
  testMatch: ['**/tests/mysql/**/*.test.js'],
  setupFiles: ['<rootDir>/tests/mysql/setup.js'],
  testTimeout: 30000,
  verbose: true,
};
