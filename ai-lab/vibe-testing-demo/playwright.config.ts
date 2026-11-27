import { defineConfig, devices } from '@playwright/test';

const version = process.env.APP_VERSION ?? 'v1';
if (!['v1', 'v2', 'mutant'].includes(version)) {
  throw new Error(`Unsupported APP_VERSION: ${version}`);
}

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  reporter: [['list'], ['html', { open: 'never' }]],
  webServer: {
    command: `node scripts/serve.mjs ${version}`,
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
  },
  use: { baseURL: 'http://127.0.0.1:4173' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
