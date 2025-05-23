// webpack.config.js
const path = require('path');

module.exports = {
  mode: 'development', // or 'production'
  entry: './static/ts/src/main.ts', // Your main TypeScript file
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    filename: 'bundle.js', // Output bundle name
    path: path.resolve(__dirname, 'static/ts/dist'), // Output directory
  },
  devtool: 'inline-source-map', // For better debugging, remove for production
};