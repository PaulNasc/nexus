const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

// Detect production: --mode production sets argv, NODE_ENV may not be set yet
const args = process.argv || [];
const isDev = !args.includes('production') && (process.env.NODE_ENV || 'development') !== 'production';

module.exports = {
  entry: './src/renderer/index.tsx',
  target: 'web',
  mode: process.env.NODE_ENV || 'development',
  
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: 'ts-loader',
          options: {
            configFile: 'tsconfig.renderer.json',
          },
        },
        exclude: /node_modules/,
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.jsx'],
    fallback: {
      "path": require.resolve("path-browserify"),
      "buffer": require.resolve("buffer"),
      "process": require.resolve("process/browser"),
      "events": require.resolve("events"),
    }
  },
  
  node: {
    global: true,
  },
  
  output: {
    filename: 'renderer.js',
    path: path.resolve(__dirname, 'dist/renderer'),
    publicPath: isDev ? '/' : './',
    clean: true,
  },
  
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/renderer/index.html',
      filename: 'index.html',
    }),
    // DefinePlugin removed - webpack automatically defines NODE_ENV
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
      process: 'process/browser',
      global: 'globalThis',
    }),
  ],
  
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist/renderer'),
    },
    compress: true,
    port: 3000,
    hot: false, // Desabilitando hot reload para evitar loops
    liveReload: false, // Desabilitando live reload
    devMiddleware: {
      publicPath: '/',
    },
    historyApiFallback: {
      index: '/index.html',
    },
    watchFiles: {
      paths: ['src/**/*'],
      options: {
        usePolling: false,
        ignored: /node_modules/,
      },
    },
    client: {
      overlay: {
        errors: true,
        warnings: false,
      },
    },
    headers: {
      'Access-Control-Allow-Origin': '*',
    }
  },
  
  devtool: process.env.NODE_ENV === 'production' ? 'source-map' : 'eval-source-map',
};