import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from '@fastify/type-provider-zod'
import { verifyJwt } from '../middlewares/verify-jwt'
import { acknowledgeSettlement } from '../controllers/acknowledge-settlement-controller'
import { acknowledgeSettlementRouteSchema } from '../schemas/settlement.schema'

// Sem verifyMembership de propósito (D-31): a rota não tem :groupId. AcknowledgeSettlement
// exige que o requisitante seja o credor do acerto, o que já implica ser membro do grupo.
export async function settlementRoutes(fastify: FastifyInstance) {
    const app = fastify.withTypeProvider<ZodTypeProvider>()

    app.addHook('preHandler', verifyJwt)

    app.patch('/settlements/:settlementId/acknowledge', { schema: acknowledgeSettlementRouteSchema }, acknowledgeSettlement)
}
