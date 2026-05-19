import { FastifyRequest, FastifyReply } from 'fastify'

declare module '@fastify/jwt' {
    interface FastifyJWT {
        payload: { sub: string }
        user: { sub: string }
    }
}

export async function verifyJwt(request: FastifyRequest, reply: FastifyReply) {
    try {
        await request.jwtVerify()
    } catch {
        return reply.status(401).send({ message: 'Token inválido ou expirado' })
    }
}
