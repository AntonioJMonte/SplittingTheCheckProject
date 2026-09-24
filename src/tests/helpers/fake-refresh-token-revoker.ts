import { RefreshTokenRevoker } from '../../application/services/refresh-token-revoker'

export class FakeRefreshTokenRevoker implements RefreshTokenRevoker {
    public readonly revoked = new Map<string, number>()
    public failClosed = false

    async revoke(token: string, ttlSeconds: number): Promise<void> {
        this.revoked.set(token, ttlSeconds)
    }

    async isRevoked(token: string): Promise<boolean> {
        if (this.failClosed) {
            return true
        }
        return this.revoked.has(token)
    }
}
