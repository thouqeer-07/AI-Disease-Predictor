import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 60000,
  verbose: true,
  testMatch: ['**/tests/**/*.test.ts'],
  reporters: ['default', '<rootDir>/helpers/custom-reporter.js']
};

export default config;
