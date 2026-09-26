import Redis from 'ioredis'
import { env } from '../env'
import { logger } from '../logger/logger'

// D-61: sem um listener de 'error' o ioredis emite no EventEmitter sem ninguém escutando, e o
// Node derruba o processo inteiro — foi assim que uma queda do Redis matou a API. Com o handler
// a falha vira log e o servidor segue de pé, que é o que o D-37 pressupõe ao responder 401 em
// /refresh enquanto o Redis estiver fora.
function withErrorLogging(client: Redis, role: 'cache' | 'pubsub'): Redis {
    client.on('error', (err: Error) => {
        logger.error({ err, role }, 'Falha na conexão com o Redis')
    })
    return client
}

let _client: Redis | undefined

export function getRedisClient(): Redis {
    if (!_client) {
        _client = withErrorLogging(
            new Redis(env.REDIS_URL, {
                enableOfflineQueue: false,
                maxRetriesPerRequest: 0,
            }),
            'cache',
        )
    }
    return _client
}

export function createRedisClient(): Redis {
    // D-62: `null` remove o teto de retries por comando. O adapter do socket.io emite comandos
    // logo no boot; com o teto padrão de 20 o ioredis esvazia a fila rejeitando todos eles, e
    // essa rejeição — que ninguém captura — derruba o processo. Sem teto o cliente simplesmente
    // espera o Redis voltar. O cache segue com a política oposta, falhando rápido (D-37).
    return withErrorLogging(new Redis(env.REDIS_URL, { maxRetriesPerRequest: null }), 'pubsub')
}
