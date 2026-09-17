import { describe, it, expect, afterAll, beforeEach, vi } from 'vitest'
import { app } from '../../infra/http/app'

const health = vi.hoisted(() => ({
    checks: { database: 'up', redis: 'up' } as { database: 'up' | 'down'; redis: 'up' | 'down' },
}))

vi.mock('../../infra/http/services/dependency-health', () => ({
    checkDependencies: async () => health.checks,
}))

describe('Health e2e', () => {
    beforeEach(() => {
        health.checks = { database: 'up', redis: 'up' }
    })

    afterAll(async () => {
        await app.close()
    })

    it('GET /health → 200 without authentication when Postgres and Redis are up', async () => {
        const res = await app.inject({ method: 'GET', url: '/health' })

        expect(res.statusCode).toBe(200)
        expect(res.json()).toEqual({ status: 'ok', checks: { database: 'up', redis: 'up' } })
    })

    it.each([
        ['database', { database: 'down', redis: 'up' }],
        ['redis', { database: 'up', redis: 'down' }],
    ] as const)('GET /health → 503 when %s is down', async (_label, checks) => {
        health.checks = { ...checks }

        const res = await app.inject({ method: 'GET', url: '/health' })

        expect(res.statusCode).toBe(503)
        expect(res.json()).toEqual({ status: 'degraded', checks })
    })
})
