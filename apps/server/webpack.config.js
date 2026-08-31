const { join, resolve } = require('path');
const nodeExternals = require('webpack-node-externals');

const isProd = process.env.NODE_ENV === 'production';

module.exports = {
  entry: './src/main.ts',
  target: 'node',
  mode: isProd ? 'production' : 'development',
  devtool: isProd ? false : 'source-map',
  output: {
    path: join(__dirname, 'dist'),
    filename: 'main.js',
    clean: true,
    ...(!isProd && {
      devtoolModuleFilenameTemplate: '[absolute-resource-path]',
    }),
  },
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      '@product-engineer-community-service/supabase': resolve(__dirname, '../../packages/supabase/src/index.ts'),
    },
  },
  externals: [
    nodeExternals({
      modulesDir: resolve(__dirname, '../../node_modules'),
      allowlist: [/^@product-engineer-community-service\//],
    }),
    '@nestjs/microservices',
    '@nestjs/microservices/microservices-module',
    '@nestjs/websockets',
    '@nestjs/websockets/socket-module',
    'bufferutil',
    'utf-8-validate',
  ],
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: {
          loader: 'swc-loader',
          options: {
            jsc: {
              parser: {
                syntax: 'typescript',
                decorators: true,
              },
              transform: {
                legacyDecorator: true,
                decoratorMetadata: true,
              },
              target: 'es2021',
            },
            module: {
              type: 'commonjs',
            },
          },
        },
        exclude: /node_modules/,
      },
    ],
  },
  optimization: {
    minimize: isProd,
  },
};
