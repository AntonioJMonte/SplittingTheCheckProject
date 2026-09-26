import { describe, it, expect } from 'vitest'
import type { Server } from 'socket.io'
import { setIo, io } from '../../../../infra/websocket/io'

describe('io registry', () => {
    it('should start undefined so callers can skip emitting before the server is up', () => {
        expect(io).toBeUndefined()
    })

    it('should expose the server after setIo', async () => {
        const fake = { to: () => ({ emit: () => {} }) } as unknown as Server

        setIo(fake)

        const registry = await import('../../../../infra/websocket/io')
        expect(registry.io).toBe(fake)
    })
})
