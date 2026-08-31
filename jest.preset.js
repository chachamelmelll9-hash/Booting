const path = require('path');

module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]sx?$': ['@swc/jest', {}],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  coverageDirectory: '<rootDir>/coverage',
  moduleNameMapper: {
    '@product-engineer-community-service/(.*)': path.resolve(__dirname, 'packages/$1/src'),
  },
};
