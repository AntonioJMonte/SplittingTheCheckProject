import { RefreshTokenUseCase } from '../../application/use-cases/auth/refresh-token-use-case'
import { RedisRefreshTokenBlacklist } from '../cache/refresh-token-blacklist'
import { PrismaUserRepository } from '../database/prisma/prismaUserRepository'

export function makeRefreshTokenUseCase() {
    const userRepository = new PrismaUserRepository()
    const refreshTokenRevoker = new RedisRefreshTokenBlacklist()
    return new RefreshTokenUseCase(userRepository, refreshTokenRevoker)
}
