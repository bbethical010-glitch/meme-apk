import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/ui',
  outputDir: './test-results',
  use: { baseURL: 'http://127.0.0.1:3100', viewport: { width: 390, height: 844 }, channel: 'chromium' },
  webServer: { command: 'npm run dev -- --port 3100 --host 127.0.0.1', url: 'http://127.0.0.1:3100', reuseExistingServer: false },
});
