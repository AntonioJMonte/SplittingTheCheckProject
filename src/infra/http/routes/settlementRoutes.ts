import { FastifyInstance } from 'fastify'
import { verifyJwt } from '../middlewares/verify-jwt'
import { acknowledgeSettlement } from '../controllers/acknowledge-settlement-controller'

export async function settlementRoutes(app: FastifyInstance) {
    app.addHook('preHandler', verifyJwt)

    app.patch('/settlements/:settlementId/acknowledge', acknowledgeSettlement)
}
