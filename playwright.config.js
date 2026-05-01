const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: '.',
  timeout: 120000,
  retries: 2,
  reporter: [
    ['list'],
    ['html', { outputFolder: './VHREU E2E/report', open: 'never' }],
  ],
  use: {
    headless: true,
    launchOptions: {
      args: ['--disable-quic'],
    },
    video: {
      mode: 'on',
      dir: './test-results/VHREU-preloader-preview-to-checkout',
    },
  },
  outputDir: './test-results/VHREU-preloader-preview-to-checkout',
});
