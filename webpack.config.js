/* eslint-disable @typescript-eslint/no-var-requires */
//@ts-check

'use strict';

const path = require('path');

//@ts-check
/** @type {import('webpack').Configuration} */
const config = {
  target: 'node', // VS Code extensions run in a Node.js-context 
  mode: 'none', // This leaves the source code as close as possible to the original (when packaging we set this to 'production')

  entry: {
    extension: './src/extension.ts' // The entry point of this extension
  },
  output: {
    // The bundle is stored in the 'dist' folder
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    libraryTarget: 'commonjs',
    devtoolModuleFilenameTemplate: '../[resource-path]'
  },
  devtool: 'nosources-source-map',
  externals: {
    vscode: 'commonjs vscode' // The vscode-module is created on-the-fly and must be excluded. Include other modules that cannot be bundled as needed
  },
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
    }
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader'
          }
        ]
      }
    ]
  }
};

module.exports = config;
