import { env } from '../env'
import { getRedisClient } from '../redis/redis-client'

export const RATE_LIMIT_WINDOW = '1 minute'
export const GLOBAL_RATE_LIMIT_MAX = 100
export const AUTH_RATE_LIMIT_MAX = 5
export const CATEGORIZE_RATE_LIMIT_MAX = 10

// Os limites reais derrubariam a suíte: os e2e repetem registro e login dezenas de vezes a
// partir do mesmo IP. O plugin continua registrado para que o caminho exercitado seja o mesmo;
// quem valida os números de verdade é o spec de rate limit, numa instância própria.
const TEST_MAX = 100_000

function maxFor(value: number): number {
    return env.NODE_ENV === 'test' ? TEST_MAX : value
}

export const globalRateLimitOptions = {
    global: true,
    max: maxFor(GLOBAL_RATE_LIMIT_MAX),
    timeWindow: RATE_LIMIT_WINDOW,
    // D-68: a contagem é compartilhada entre instâncias via Redis. Em teste fica em memória
    // para não abrir conexão real ao importar o app.
    redis: env.NODE_ENV === 'test' ? undefined : getRedisClient(),
    // Oposto deliberado do fail-closed do D-37: sem Redis, perder o limite por um tempo é
    // melhor do que recusar todo mundo. A contagem não é fonte de verdade de nada.
    skipOnError: true,
}

// Aplicado por rota via `config.rateLimit`. Brute force de senha é o ataque que isto fecha.
export const authRateLimit = {
    max: maxFor(AUTH_RATE_LIMIT_MAX),
    timeWindow: RATE_LIMIT_WINDOW,
}

// Cada chamada é uma requisição faturada à Anthropic, então o teto é mais baixo que o global.
export const categorizeRateLimit = {
    max: maxFor(CATEGORIZE_RATE_LIMIT_MAX),
    timeWindow: RATE_LIMIT_WINDOW,
}
