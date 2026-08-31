/// <reference types="jest" />
/// <reference types="node" />
module.exports = {
  displayName: '@chachamelmelll9-hash-service/mobile',
  resolver: require.resolve('./jest.resolver.js'),
  preset: 'jest-expo',
  moduleFileExtensions: ['ts', 'js', 'html', 'tsx', 'jsx'],
  setupFilesAfterEnv: ['<rootDir>/test/setup.js'],
  moduleNameMapper: {
    '\\.svg$': '<rootDir>/test/svg-mock.js',
    // jest.resolver.js forces expo/src/winter to the web runtime (runtime.ts),
    // which imports Metro dev-server glue (HMR) that cannot run under Jest.
    'async-require/setup$': '<rootDir>/test/stub-empty.js',
  },
  transform: {
    '\\.[jt]sx?$': [
      require.resolve('babel-jest'),
      {
        configFile: __dirname + '/.babelrc.js',
      },
    ],
    '^.+\\.(bmp|gif|jpg|jpeg|mp4|png|psd|svg|webp|ttf|otf|m4v|mov|mp4|mpeg|mpg|webm|aac|aiff|caf|m4a|mp3|wav|html|pdf|obj)$':
      require.resolve('jest-expo/src/preset/assetFileTransformer.js'),
  },
  coverageDirectory: '../../coverage/apps/mobile',
};
