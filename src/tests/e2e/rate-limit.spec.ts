import { describe, it, expect } from 'vitest'
import fastify from 'fastify'
import fastifyRateLimit from '@fastify/rate-limit'
import {
    AUTH_RATE_LIMIT_MAX,
    CATEGORIZE_RATE_LIMIT_MAX,
    GLOBAL_RATE_LIMIT_MAX,
    RATE_LIMIT_WINDOW,
    authRateLimit,
    categorizeRateLimit,
    globalRateLimitOptions,
} from '../../infra/http/rate-limit'

// Os limites que o app carrega em NODE_ENV=test são altos de propósito (senão a suíte inteira
// esbarraria neles). Aqui o plugin é montado com os números reais para provar o 429.
async function appWithLimit(max: number) {
    const instance = fastify()
    await instance.register(fastifyRateLimit, { global: true, max, timeWindow: RATE_LIMIT_WINDOW })
    instance.post('/alvo', async () => ({ ok: true }))
    await instance.ready()
    return instance
}

describe('Rate limit (D-67)', () => {
    it('responde 429 na requisição seguinte ao teto de autenticação', async () => {
        const instance = await appWithLimit(AUTH_RATE_LIMIT_MAX)

        for (let i = 0; i < AUTH_RATE_LIMIT_MAX; i++) {
            const permitida = await instance.inject({ method: 'POST', url: '/alvo' })
            expect(permitida.statusCode).toBe(200)
        }

        const bloqueada = await instance.inject({ method: 'POST', url: '/alvo' })

        expect(bloqueada.statusCode).toBe(429)
        expect(bloqueada.headers['retry-after']).toBeDefined()
        expect(bloqueada.headers['x-ratelimit-limit']).toBe(String(AUTH_RATE_LIMIT_MAX))

        await instance.close()
    })

    it('conta por IP: outro cliente não herda o bloqueio do primeiro', async () => {
        const instance = await appWithLimit(AUTH_RATE_LIMIT_MAX)

        for (let i = 0; i <= AUTH_RATE_LIMIT_MAX; i++) {
            await instance.inject({ method: 'POST', url: '/alvo', remoteAddress: '10.0.0.1' })
        }

        const outroCliente = await instance.inject({ method: 'POST', url: '/alvo', remoteAddress: '10.0.0.2' })

        expect(outroCliente.statusCode).toBe(200)

        await instance.close()
    })
})

describe('Configuração do rate limit (D-67/D-68)', () => {
    it('mantém o teto de autenticação bem abaixo do global, para travar brute force', () => {
        expect(AUTH_RATE_LIMIT_MAX).toBeLessThan(GLOBAL_RATE_LIMIT_MAX)
        expect(authRateLimit.timeWindow).toBe(RATE_LIMIT_WINDOW)
    })

    it('limita a recategorização mais que o global, porque cada chamada custa uma requisição à LLM', () => {
        expect(CATEGORIZE_RATE_LIMIT_MAX).toBeLessThan(GLOBAL_RATE_LIMIT_MAX)
        expect(categorizeRateLimit.timeWindow).toBe(RATE_LIMIT_WINDOW)
    })

    it('não bloqueia requisições quando o store falha (oposto do fail-closed do D-37)', () => {
        expect(globalRateLimitOptions.skipOnError).toBe(true)
    })

    it('fica em memória durante os testes, sem abrir conexão real ao Redis', () => {
        expect(globalRateLimitOptions.redis).toBeUndefined()
    })
})
