module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage/unit',
  coverageReporters: ['text-summary', 'lcov', 'json'],
  testMatch: ['**/tests/unit/**/*.test.js', '**/tests/integration/**/*.test.js'],
  collectCoverageFrom: [
    'src/utils/**/*.js',
    'src/services/**/*.js',
    'src/controllers/**/*.js',
    'src/middlewares/**/*.js',
  ],
  setupFiles: ['<rootDir>/tests/setup.js'],
  verbose: true,
};
