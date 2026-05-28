import { Server as HttpServer } from 'node:http'
import { Server as SocketServer } from 'socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import { PrismaMemberRepository } from '../database/prisma/prismaMemberRepository'
import { createRedisClient } from '../redis/redis-client'
import { wsAuthMiddleware } from './auth-middleware'
import { setIo } from './io'

export function createSocketServer(httpServer: HttpServer): SocketServer {
    const ioServer = new SocketServer(httpServer, {
        cors: { origin: '*' },
    })

    const pubClient = createRedisClient()
    const subClient = createRedisClient()
    ioServer.adapter(createAdapter(pubClient, subClient))

    ioServer.use(wsAuthMiddleware)

    ioServer.on('connection', (socket) => {
        socket.on('join_group', async (groupId: unknown) => {
            if (typeof groupId !== 'string' || !groupId) {
                socket.emit('error', { code: 'INVALID_INPUT', message: 'groupId inválido.' })
                return
            }

            const memberRepo = new PrismaMemberRepository()
            const member = await memberRepo.findByUserAndGroup(socket.data.userId, groupId)

            if (!member) {
                socket.emit('error', { code: 'FORBIDDEN', message: 'Você não é membro deste grupo.' })
                return
            }

            socket.join(groupId)
            socket.emit('joined_group', { groupId })
        })
    })

    setIo(ioServer)
    return ioServer
}
