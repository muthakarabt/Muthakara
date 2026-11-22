// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const globals = require('globals');

module.exports = defineConfig([
  expoConfig,
  {
    // dist: web build output; public/ocr: copied third-party OCR engine
    ignores: ['dist/*', 'public/ocr/*'],
  },
  {
    files: ['scripts/**/*.js'],
    languageOptions: { globals: globals.node },
  },
]);
