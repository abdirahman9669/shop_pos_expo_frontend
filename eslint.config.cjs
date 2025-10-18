// eslint.config.js — single flat config (ESLint v9)
// Uses Expo’s flat config, and registers your local plugin in ./eslint-plugin-local

const expo = require('eslint-config-expo/flat');
const localPlugin = require('./eslint-plugin-local'); // <- your folder: ./eslint-plugin-local/index.js

module.exports = [
  // 1) Start with Expo’s recommended setup (includes TS/React parser & rules)
  ...expo,

  // 2) Global ignores
  {
    ignores: ['node_modules/**', 'dist/**', 'build/**'],
  },

  // 3) Register the local plugin + rules for all JS/TS files
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      local: localPlugin,
    },
    rules: {
      // Your guardrails:
      'local/one-primary-per-file': 'warn',
      'local/no-nested-virtualized-in-scrollview': 'warn',

      // (Optional) keep/adjust any extras you want:
      // 'react/react-in-jsx-scope': 'off',
      // '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
];