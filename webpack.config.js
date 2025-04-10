const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');

module.exports = {
  entry: './src/index.ts',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              // Add transpileOnly option to skip type checking
              transpileOnly: true,
              // This will speed up compilation and ignore type errors
              compilerOptions: {
                sourceMap: true,
              }
            }
          }
        ],
        exclude: /node_modules/,
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    fallback: {
      buffer: require.resolve('buffer/'),
      crypto: require.resolve('crypto-browserify'),
      stream: require.resolve('stream-browserify'),
      util: require.resolve('util/'),
      process: require.resolve('process/browser'),
      path: require.resolve('path-browserify'),
      fs: false,
      os: require.resolve('os-browserify/browser'),
      vm: require.resolve('vm-browserify'),
    }
  },
  // Add browser polyfills
  plugins: [
    // Provide global variables
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
    }),
    new HtmlWebpackPlugin({
      template: 'src/index.html',
    }),
    new CopyWebpackPlugin({
      patterns: [
        { 
          from: path.resolve(__dirname, 'reference-wasi-fs-access/uutils.async.wasm'),
          to: path.resolve(__dirname, 'dist')
        },
      ],
    }),
  ],
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist'),
    },
    port: 8080,
    compress: true,
    hot: true,
  },

};
