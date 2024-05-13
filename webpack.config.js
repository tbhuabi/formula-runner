const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');
const ip = require('ip');

module.exports = {
  mode: 'development',
  devtool: 'cheap-module-source-map',
  entry: {
    index: path.resolve(__dirname, 'index.ts')
  },
  output: {
    path: path.resolve(__dirname, 'dist')
  },
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      '@tanbo/formula-runner': path.resolve('src/public-api.ts'),
      '@tanbo/': path.resolve('src'),
    }
  },
  devServer: {
    host: ip.address(),
    historyApiFallback: true,
    static: {
      directory: path.join(__dirname, 'dist'),
    },
    compress: true,
    port: 3333,
    hot: true,
    open: true,
  },
  module: {
    rules: [
    //   {
    //   test: /\.ts$/,
    //   enforce: 'pre',
    //   exclude: /node_modules/,
    //   loader: [{
    //     loader: 'eslint-loader'
    //   }]
    // },
      {
      test: /\.ts$/,
      use: ['ts-loader']
    }]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: 'index.html'
    })
  ]
};
