import type { Server } from 'socket.io'

export let io: Server | undefined = undefined

export function setIo(server: Server): void {
    io = server
}
