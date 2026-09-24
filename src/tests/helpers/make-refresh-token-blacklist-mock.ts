export function makeRefreshTokenBlacklistMock(store: { tokens: Set<string> }) {
    return {
        RedisRefreshTokenBlacklist: class {
            async revoke(token: string) {
                store.tokens.add(token)
            }
            async isRevoked(token: string) {
                return store.tokens.has(token)
            }
        },
    }
}
