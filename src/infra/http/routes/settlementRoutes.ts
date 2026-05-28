import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from '@fastify/type-provider-zod'
import { verifyJwt } from '../middlewares/verify-jwt'
import { acknowledgeSettlement } from '../controllers/acknowledge-settlement-controller'
import { acknowledgeSettlementRouteSchema } from '../schemas/settlement.schema'

export async function settlementRoutes(fastify: FastifyInstance) {
    const app = fastify.withTypeProvider<ZodTypeProvider>()

    app.addHook('preHandler', verifyJwt)

    app.patch('/settlements/:settlementId/acknowledge', { schema: acknowledgeSettlementRouteSchema }, acknowledgeSettlement)
}
