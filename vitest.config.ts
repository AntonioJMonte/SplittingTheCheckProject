import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/tests/**/*.spec.ts'],
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/test',
      JWT_SECRET: 'test-jwt-secret-at-least-32-characters!!',
      JWT_REFRESH_SECRET: 'test-refresh-secret-at-least-32-chars!!',
      JWT_EXPIRES_IN: '10m',
      JWT_REFRESH_EXPIRES_IN: '7d',
      ANTHROPIC_API_KEY: 'test-api-key',
    },
  },
})