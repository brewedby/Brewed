// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'supabase/functions/*'],
  },
  {
    rules: {
      // Apostrophes/quotes inside React Native <Text> render literally —
      // this web-only rule is noise here.
      'react/no-unescaped-entities': 'off',
    },
  },
  {
    // Test scripts run under tsx and set things up before importing
    // the modules under test.
    files: ['lib/__tests__/**'],
    rules: { 'import/first': 'off' },
  },
]);
