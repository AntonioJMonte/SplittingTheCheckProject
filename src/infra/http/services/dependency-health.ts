import { once } from 'node:events'
import { prisma } from '../../database/prisma/prismaClient'
import { getRedisClient } from '../../redis/redis-client'

export type DependencyStatus = 'up' | 'down'

export interface DependencyHealth {
    database: DependencyStatus
    redis: DependencyStatus
}

const PROBE_TIMEOUT_MS = 2_000

export async function probeDependency(
    check: (signal: AbortSignal) => Promise<unknown>,
    timeoutMs: number = PROBE_TIMEOUT_MS,
): Promise<DependencyStatus> {
    const controller = new AbortController()
    let timer: NodeJS.Timeout | undefined

    const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
            controller.abort()
            reject(new Error(`Probe excedeu ${timeoutMs}ms`))
        }, timeoutMs)
    })

    try {
        await Promise.race([check(controller.signal), timeout])
        return 'up'
    } catch {
        return 'down'
    } finally {
        clearTimeout(timer)
    }
}

async function pingDatabase(): Promise<void> {
    await prisma.$queryRaw`SELECT 1`
}

// The shared client disables the offline queue, so a ping issued while it is still connecting
// fails instantly; wait for "ready" (bounded by the probe timeout) to avoid a false "down".
async function pingRedis(signal: AbortSignal): Promise<void> {
    const client = getRedisClient()
    if (client.status !== 'ready') {
        await once(client, 'ready', { signal })
    }
    await client.ping()
}

export async function checkDependencies(): Promise<DependencyHealth> {
    const [database, redis] = await Promise.all([
        probeDependency(pingDatabase),
        probeDependency(pingRedis),
    ])
    return { database, redis }
}
