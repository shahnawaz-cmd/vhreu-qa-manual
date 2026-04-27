const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: '.',
  timeout: 90000,
  reporter: [
    ['list'],
    ['html', { outputFolder: './test-results/report', open: 'on-failure' }],
  ],
  use: {
    headless: false,
    video: {
      mode: 'on',
      dir: './test-results/VHREU-preloader-preview-to-checkout',
    },
  },
  outputDir: './test-results/VHREU-preloader-preview-to-checkout',
});
