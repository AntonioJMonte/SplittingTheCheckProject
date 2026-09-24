export interface RefreshTokenRevoker {
    revoke(token: string, ttlSeconds: number): Promise<void>
    isRevoked(token: string): Promise<boolean>
}
