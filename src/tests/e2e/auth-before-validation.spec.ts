import { randomUUID } from 'node:crypto'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fastify, { FastifyInstance } from 'fastify'
import fastifyJwt from '@fastify/jwt'
import fastifyRateLimit from '@fastify/rate-limit'
import { serializerCompiler, validatorCompiler } from '@fastify/type-provider-zod'
import { app } from '../../infra/http/app'
import { groupRoutes } from '../../infra/http/routes/groupRoutes'
import { expenseRoutes } from '../../infra/http/routes/expenseRoutes'
import { settlementRoutes } from '../../infra/http/routes/settlementRoutes'
import { userRoutes } from '../../infra/http/routes/userRoutes'

// Um caso por arquivo de rotas e por forma de registro do hook (instância ou rota). Todos os
// payloads e parâmetros são inválidos: sem o D-63 a resposta seria 400, não 401.
const invalidRequests = [
    { routes: groupRoutes, method: 'POST', url: '/groups', payload: {} },
    { routes: expenseRoutes, method: 'PATCH', url: '/expenses/nao-e-uuid', payload: { amount: 'abc' } },
    { routes: settlementRoutes, method: 'PATCH', url: '/settlements/nao-e-uuid/acknowledge', payload: undefined },
    { routes: userRoutes, method: 'PATCH', url: '/users/pix-key', payload: { pixKey: 123 } },
    { routes: userRoutes, method: 'PATCH', url: '/users/phone', payload: { phone: 123 } },
] as const

afterAll(async () => {
    await app.close()
})

describe('Autenticação antes da validação (D-63)', () => {
    beforeAll(async () => {
        await app.ready()
    })

    it.each(invalidRequests)('$method $url sem token → 401, mesmo com entrada inválida', async ({ method, url, payload }) => {
        const res = await app.inject({ method, url, payload })

        expect(res.statusCode).toBe(401)
        expect(res.json().message).toBe('Token inválido ou expirado')
    })

    it.each(invalidRequests)('$method $url com token → 400, a validação continua valendo', async ({ method, url, payload }) => {
        const token = app.jwt.sign({ sub: randomUUID() })

        const res = await app.inject({ method, url, payload, headers: { Authorization: `Bearer ${token}` } })

        expect(res.statusCode).toBe(400)
    })
})

// O plugin de rate limit pendura o hook dele em cada rota, e hooks de rota rodam depois dos de
// instância. Com o verifyJwt em `onRequest` anônimos nunca chegariam ao limite; aqui o teto
// baixo prova que eles continuam contando.
async function appWithRoutes(routes: (instance: FastifyInstance) => Promise<void>, max: number) {
    const instance = fastify()
    instance.setValidatorCompiler(validatorCompiler)
    instance.setSerializerCompiler(serializerCompiler)
    await instance.register(fastifyJwt, { secret: 'segredo-de-teste-com-pelo-menos-32-caracteres' })
    await instance.register(fastifyRateLimit, { global: true, max, timeWindow: '1 minute' })
    await instance.register(routes)
    await instance.ready()
    return instance
}

describe('Rate limit continua contando requisições sem token (D-63 × D-68)', () => {
    it.each(invalidRequests)('$method $url responde 429 depois do teto', async ({ routes, method, url, payload }) => {
        const max = 2
        const instance = await appWithRoutes(routes, max)

        for (let i = 0; i < max; i++) {
            const rejected = await instance.inject({ method, url, payload })
            expect(rejected.statusCode).toBe(401)
        }

        const limited = await instance.inject({ method, url, payload })

        expect(limited.statusCode).toBe(429)

        await instance.close()
    })
})
