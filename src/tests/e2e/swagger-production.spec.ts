import { describe, it, expect, afterAll, vi } from 'vitest'

// Monta uma instância do app como se estivesse em produção. O env e o rate limit são mockados
// para não recarregar `dotenv/config` nem abrir conexão com o Redis real.
async function productionApp() {
    vi.resetModules()
    vi.doMock('../../infra/env', () => ({
        env: {
            NODE_ENV: 'production',
            PORT: 3333,
            JWT_SECRET: 'test-jwt-secret-at-least-32-characters!!',
            JWT_REFRESH_SECRET: 'test-refresh-secret-at-least-32-chars!!',
            JWT_EXPIRES_IN: '10m',
            JWT_REFRESH_EXPIRES_IN: '7d',
            LOG_LEVEL: 'silent',
            CORS_ORIGIN: ['http://localhost:5173'],
            DATABASE_URL: 'postgresql://x',
            REDIS_URL: 'redis://x',
        },
    }))
    vi.doMock('../../infra/http/rate-limit', () => ({
        globalRateLimitOptions: { global: true, max: 100_000, timeWindow: '1 minute' },
        authRateLimit: { max: 100_000, timeWindow: '1 minute' },
        categorizeRateLimit: { max: 100_000, timeWindow: '1 minute' },
    }))
    const { app } = await import('../../infra/http/app')
    await app.ready()
    return app
}

describe('Swagger em produção (D-70)', () => {
    afterAll(() => {
        vi.resetModules()
    })

    it('não expõe /docs nem /docs/json quando NODE_ENV é production', async () => {
        const app = await productionApp()

        const ui = await app.inject({ method: 'GET', url: '/docs' })
        const json = await app.inject({ method: 'GET', url: '/docs/json' })

        expect(ui.statusCode).toBe(404)
        expect(json.statusCode).toBe(404)

        await app.close()
    })

    it('mantém as rotas de negócio funcionando sem o Swagger', async () => {
        const app = await productionApp()

        // 401 e não 404: a rota existe, apenas exige autenticação.
        const res = await app.inject({ method: 'GET', url: '/groups' })

        expect(res.statusCode).toBe(401)

        await app.close()
    })
})
