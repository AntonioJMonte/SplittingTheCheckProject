import { RefreshTokenRevoker } from '../../services/refresh-token-revoker'

interface LogoutUseCaseRequest {
    token: string
    expiresAt: number
}

interface LogoutUseCaseResponse {
    revoked: boolean
}

export class LogoutUseCase {

    constructor(private refreshTokenRevoker: RefreshTokenRevoker) {}

    async execute({ token, expiresAt }: LogoutUseCaseRequest): Promise<LogoutUseCaseResponse> {
        const ttlSeconds = expiresAt - Math.floor(Date.now() / 1000)

        // Token já vencido não precisa entrar na blacklist: o próprio JWT já o rejeita.
        if (ttlSeconds <= 0) {
            return { revoked: false }
        }

        await this.refreshTokenRevoker.revoke(token, ttlSeconds)
        return { revoked: true }
    }
}
