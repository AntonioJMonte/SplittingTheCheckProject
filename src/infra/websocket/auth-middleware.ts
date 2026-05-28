import type { Socket } from 'socket.io'
import { verify, TokenExpiredError } from 'jsonwebtoken'
import { env } from '../env'

export function wsAuthMiddleware(socket: Socket, next: (err?: Error) => void): void {
    const token: unknown = socket.handshake.auth.token

    if (typeof token !== 'string' || !token) {
        return next(new Error('UNAUTHORIZED'))
    }

    try {
        const payload = verify(token, env.JWT_SECRET) as { sub: string }
        socket.data.userId = payload.sub
        next()
    } catch (err) {
        if (err instanceof TokenExpiredError) {
            return next(new Error('TOKEN_EXPIRED'))
        }
        next(new Error('UNAUTHORIZED'))
    }
}
