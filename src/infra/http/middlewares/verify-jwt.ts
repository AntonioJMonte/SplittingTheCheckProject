import { FastifyRequest, FastifyReply } from 'fastify'

declare module '@fastify/jwt' {
    interface FastifyJWT {
        payload: { sub: string }
        user: { sub: string }
    }
}

// D-63: registrar como `preValidation`. Antes da validação, para quem não tem token receber 401
// em vez de um 400 que revela o formato do payload. Não em `onRequest`: o rate limit instala o
// hook dele na rota, hooks de rota rodam depois dos de instância, e anônimos sairiam do limite.
export async function verifyJwt(request: FastifyRequest, reply: FastifyReply) {
    try {
        await request.jwtVerify()
    } catch {
        return reply.status(401).send({ message: 'Token inválido ou expirado' })
    }
}
