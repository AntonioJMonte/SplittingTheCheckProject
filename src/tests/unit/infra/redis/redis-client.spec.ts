import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { EventEmitter } from 'node:events'

class FakeRedis extends EventEmitter {
    constructor(
        readonly url: string,
        readonly options?: Record<string, unknown>,
    ) {
        super()
        built.push(this)
    }
}

let built: FakeRedis[] = []
let logged: Array<Record<string, unknown>> = []

// O env e o logger são mockados para não recarregar `dotenv/config` nem abrir um transport do
// pino a cada reimportação do módulo sob teste.
async function loadModule() {
    vi.resetModules()
    vi.doMock('ioredis', () => ({ default: FakeRedis }))
    vi.doMock('../../../../infra/env', () => ({ env: { REDIS_URL: 'redis://fake:6379' } }))
    vi.doMock('../../../../infra/logger/logger', () => ({
        logger: { error: (payload: Record<string, unknown>) => logged.push(payload) },
    }))
    return import('../../../../infra/redis/redis-client')
}

describe('redis-client (D-61)', () => {
    beforeEach(() => {
        built = []
        logged = []
    })

    afterEach(() => {
        vi.resetModules()
    })

    it('não derruba o processo quando o cliente de pub/sub emite error', async () => {
        const { createRedisClient } = await loadModule()
        const client = createRedisClient() as unknown as FakeRedis

        // Sem listener de 'error', este emit lançaria e mataria o processo.
        expect(() => client.emit('error', new Error('ECONNREFUSED'))).not.toThrow()
        expect(client.listenerCount('error')).toBeGreaterThan(0)
    })

    it('não derruba o processo quando o cliente de cache emite error', async () => {
        const { getRedisClient } = await loadModule()
        const client = getRedisClient() as unknown as FakeRedis

        expect(() => client.emit('error', new Error('ECONNREFUSED'))).not.toThrow()
    })

    it('loga o erro com o papel do cliente e a causa original', async () => {
        const { createRedisClient } = await loadModule()
        const cause = new Error('ECONNREFUSED')

        ;(createRedisClient() as unknown as FakeRedis).emit('error', cause)

        expect(logged).toHaveLength(1)
        expect(logged[0]).toMatchObject({ role: 'pubsub', err: cause })
    })

    it('mantém o cache fail-closed: sem fila offline e sem retry por request (D-37)', async () => {
        const { getRedisClient } = await loadModule()
        getRedisClient()

        expect(built[0].options).toMatchObject({ enableOfflineQueue: false, maxRetriesPerRequest: 0 })
    })

    it('deixa o pub/sub sem teto de retries, para a fila não ser rejeitada em bloco (D-62)', async () => {
        const { createRedisClient } = await loadModule()
        createRedisClient()

        // Com o teto padrão de 20 o ioredis rejeita os comandos enfileirados, e a rejeição
        // não capturada mata o processo quando o Redis está fora no boot.
        expect(built[0].options).toMatchObject({ maxRetriesPerRequest: null })
    })

    it('reaproveita o mesmo cliente de cache e cria um novo a cada chamada de pub/sub', async () => {
        const { getRedisClient, createRedisClient } = await loadModule()

        expect(getRedisClient()).toBe(getRedisClient())
        expect(createRedisClient()).not.toBe(createRedisClient())
    })
})
