import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from '@fastify/type-provider-zod'
import { healthCheck } from '../controllers/health-check-controller'
import { healthRouteSchema } from '../schemas/health.schema'

export async function healthRoutes(fastify: FastifyInstance) {
    const app = fastify.withTypeProvider<ZodTypeProvider>()

    app.get('/health', { schema: healthRouteSchema }, healthCheck)
}
