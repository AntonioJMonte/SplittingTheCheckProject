import { describe, it, expect } from 'vitest'
import { sign } from 'jsonwebtoken'
import type { Socket } from 'socket.io'
import { wsAuthMiddleware } from '../../../../infra/websocket/auth-middleware'
import { env } from '../../../../infra/env'

function makeSocket(token?: unknown): Socket {
    return {
        handshake: { auth: token === undefined ? {} : { token } },
        data: {} as Record<string, unknown>,
    } as unknown as Socket
}

// Executa o middleware e devolve o erro passado ao next (ou undefined quando autorizou).
function run(socket: Socket): Error | undefined {
    let received: Error | undefined
    let calls = 0
    wsAuthMiddleware(socket, err => {
        received = err
        calls++
    })
    expect(calls, 'next deve ser chamado exatamente uma vez').toBe(1)
    return received
}

describe('wsAuthMiddleware', () => {
    it('should accept a valid token and expose the user id on the socket', () => {
        const token = sign({ sub: 'user-1' }, env.JWT_SECRET, { expiresIn: '5m' })
        const socket = makeSocket(token)

        expect(run(socket)).toBeUndefined()
        expect(socket.data.userId).toBe('user-1')
    })

    it('should reject a handshake without a token', () => {
        expect(run(makeSocket())?.message).toBe('UNAUTHORIZED')
    })

    it('should reject an empty token', () => {
        expect(run(makeSocket(''))?.message).toBe('UNAUTHORIZED')
    })

    it('should reject a token that is not a string', () => {
        expect(run(makeSocket(12345))?.message).toBe('UNAUTHORIZED')
        expect(run(makeSocket({ jwt: 'x' }))?.message).toBe('UNAUTHORIZED')
    })

    it('should reject a token signed with another secret', () => {
        const token = sign({ sub: 'user-1' }, 'outro-segredo-com-mais-de-32-caracteres', { expiresIn: '5m' })

        expect(run(makeSocket(token))?.message).toBe('UNAUTHORIZED')
    })

    it('should distinguish an expired token from an invalid one', () => {
        const token = sign({ sub: 'user-1' }, env.JWT_SECRET, { expiresIn: '-1s' })

        expect(run(makeSocket(token))?.message).toBe('TOKEN_EXPIRED')
    })

    it('should not set a user id when authentication fails', () => {
        const socket = makeSocket('nao-e-um-jwt')

        run(socket)

        expect(socket.data.userId).toBeUndefined()
    })
})
