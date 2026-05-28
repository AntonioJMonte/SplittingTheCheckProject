import Redis from 'ioredis'
import { env } from '../env'

let _client: Redis | undefined

export function getRedisClient(): Redis {
    if (!_client) {
        _client = new Redis(env.REDIS_URL, {
            enableOfflineQueue: false,
            maxRetriesPerRequest: 0,
        })
    }
    return _client
}

export function createRedisClient(): Redis {
    return new Redis(env.REDIS_URL)
}
