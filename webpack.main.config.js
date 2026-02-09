const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: process.env.NODE_ENV || 'development',
  entry: './src/main/bootstrap.ts',
  target: 'electron-main',
  output: {
    path: path.resolve(__dirname, 'dist/main'),
    filename: 'index.js'
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  externals: {
    // Excluir todos os módulos nativos para evitar problemas de empacotamento
    'sqlite3': 'commonjs sqlite3',
    'better-sqlite3': 'commonjs better-sqlite3',
    'mysql': 'commonjs mysql',
    'mysql2': 'commonjs mysql2',
    'pg': 'commonjs pg',
    'pg-query-stream': 'commonjs pg-query-stream',
    'tedious': 'commonjs tedious',
    'oracledb': 'commonjs oracledb',
    'fsevents': 'commonjs fsevents'
  },
  node: {
    __dirname: false,
    __filename: false
  },
  // Ignorar avisos sobre módulos não encontrados
  ignoreWarnings: [
    {
      module: /node_modules\/sqlite3/,
    },
    {
      module: /node_modules\/bindings/,
    }
  ],
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'assets', to: '../assets' },
        { from: 'node_modules/node-unrar-js/dist/js/unrar.wasm', to: 'unrar.wasm' }
      ],
    }),
  ]
}; 