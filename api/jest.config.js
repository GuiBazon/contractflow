module.exports = {
  testEnvironment: 'node',
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
