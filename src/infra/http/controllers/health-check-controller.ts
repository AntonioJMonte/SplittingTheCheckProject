import { FastifyRequest, FastifyReply } from 'fastify'
import { checkDependencies } from '../services/dependency-health'

export async function healthCheck(_request: FastifyRequest, reply: FastifyReply) {
    const checks = await checkDependencies()
    const healthy = checks.database === 'up' && checks.redis === 'up'

    return reply.status(healthy ? 200 : 503).send({
        status: healthy ? 'ok' : 'degraded',
        checks,
    })
}
