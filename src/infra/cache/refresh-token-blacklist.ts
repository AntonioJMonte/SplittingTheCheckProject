import { RefreshTokenRevoker } from '../../application/services/refresh-token-revoker'
import { sha256Hex } from '../../shared/utils/hash-text'
import { logger } from '../logger/logger'
import { getRedisClient } from '../redis/redis-client'

const REVOKED_PREFIX = 'refresh:revogado:'

function keyFor(token: string): string {
    return `${REVOKED_PREFIX}${sha256Hex(token)}`
}

export class RedisRefreshTokenBlacklist implements RefreshTokenRevoker {

    // Propaga o erro de propósito: um logout que não conseguiu gravar a revogação não pode
    // responder sucesso, senão o usuário acredita ter encerrado uma sessão que continua viva.
    async revoke(token: string, ttlSeconds: number): Promise<void> {
        await getRedisClient().set(keyFor(token), '1', 'EX', ttlSeconds)
    }

    // Fail-closed (D-37): sem resposta do Redis não há como provar que o token continua válido,
    // então ele é tratado como revogado — o inverso reabriria a janela para todo token revogado.
    async isRevoked(token: string): Promise<boolean> {
        try {
            return (await getRedisClient().get(keyFor(token))) !== null
        } catch (error) {
            logger.error({ err: error }, 'Redis indisponível ao consultar a blacklist de refresh tokens')
            return true
        }
    }
}
