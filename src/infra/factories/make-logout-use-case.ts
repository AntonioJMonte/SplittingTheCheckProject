import { LogoutUseCase } from '../../application/use-cases/auth/logout-use-case'
import { RedisRefreshTokenBlacklist } from '../cache/refresh-token-blacklist'

export function makeLogoutUseCase() {
    const refreshTokenRevoker = new RedisRefreshTokenBlacklist()
    return new LogoutUseCase(refreshTokenRevoker)
}
