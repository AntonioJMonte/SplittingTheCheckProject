import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/tests/**/*.spec.ts'],
    // Integration tests need a real Postgres; they run through vitest.integration.config.ts.
    exclude: [...configDefaults.exclude, 'src/tests/integration/**'],
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/test',
      JWT_SECRET: 'test-jwt-secret-at-least-32-characters!!',
      JWT_REFRESH_SECRET: 'test-refresh-secret-at-least-32-chars!!',
      JWT_EXPIRES_IN: '10m',
      JWT_REFRESH_EXPIRES_IN: '7d',
      // Empty on purpose: dotenv never overrides a defined variable, so this keeps a real key
      // from a local .env out of the test process. The env schema reads '' as "no key".
      ANTHROPIC_API_KEY: '',
    },
  },
})