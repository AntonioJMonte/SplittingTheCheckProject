import { RefreshTokenRevoker } from '../../services/refresh-token-revoker'

interface LogoutUseCaseRequest {
    token: string
    expiresAt?: number
}

interface LogoutUseCaseResponse {
    revoked: boolean
}

export class LogoutUseCase {

    constructor(private refreshTokenRevoker: RefreshTokenRevoker) {}

    async execute({ token, expiresAt }: LogoutUseCaseRequest): Promise<LogoutUseCaseResponse> {
        // Sem prazo não há TTL para a entrada na blacklist. A checagem vem antes da subtração
        // porque `undefined - agora` é NaN, e NaN atravessaria a comparação com zero abaixo
        // (toda comparação com NaN é falsa), chegando ao Redis como `EX NaN`.
        if (expiresAt === undefined || !Number.isFinite(expiresAt)) {
            return { revoked: false }
        }

        const ttlSeconds = expiresAt - Math.floor(Date.now() / 1000)

        // Token já vencido não precisa entrar na blacklist: o próprio JWT já o rejeita.
        if (ttlSeconds <= 0) {
            return { revoked: false }
        }

        await this.refreshTokenRevoker.revoke(token, ttlSeconds)
        return { revoked: true }
    }
}
