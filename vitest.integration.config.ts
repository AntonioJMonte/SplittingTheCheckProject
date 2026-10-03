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
    // D-86: a camada de banco só é exercitada aqui, então ela tem relatório e catraca próprios.
    // O relatório principal continua mostrando os repositórios em ~0%, porque lá eles são mockados.
    coverage: {
      enabled: true,
      provider: 'v8',
      include: ['src/infra/database/**/*.ts'],
      reportsDirectory: 'coverage/integration',
      reporter: ['text', 'html'],
      // Calibrados logo abaixo do medido em 03/10 (97,58 · 89,47 · 100 · 100). Baixar exige aprovação.
      thresholds: {
        statements: 96,
        branches: 87,
        functions: 98,
        lines: 98,
      },
    },
  },
})
