import { defineConfig } from 'vitest/config'
import { INTEGRATION_DATABASE_URL } from './src/tests/integration/setup/integration-database-url'

// Requires the Postgres from docker compose. Run with `npm run test:integration`.
export default defineConfig({
  test: {
    include: ['src/tests/integration/**/*.spec.ts'],
    globalSetup: ['src/tests/integration/setup/global-setup.ts'],
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: INTEGRATION_DATABASE_URL,
      JWT_SECRET: 'test-jwt-secret-at-least-32-characters!!',
      JWT_REFRESH_SECRET: 'test-refresh-secret-at-least-32-chars!!',
      ANTHROPIC_API_KEY: '',
    },
  },
})
