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
    coverage: {
      provider: 'v8',
      // `include` lists every production file, so a file nobody imports still shows up as 0%
      // instead of disappearing from the report. Only test scaffolding and the bootstrap —
      // which just wires the server and calls listen — stay out.
      include: ['src/**/*.ts'],
      exclude: ['src/tests/**', 'src/server.ts'],
      reporter: ['text', 'html'],
      // Catraca: calibrados logo abaixo do medido para travar regressão sem quebrar por ruído.
      // Baixar qualquer um destes números exige aprovação explícita (ver CLAUDE.md).
      thresholds: {
        statements: 84,
        branches: 71,
        functions: 78,
        lines: 84,
        'src/domain/**': {
          statements: 90,
          branches: 85,
          functions: 94,
          lines: 90,
        },
        'src/application/**': {
          statements: 95,
          branches: 90,
          functions: 93,
          lines: 95,
        },
      },
    },
  },
})
