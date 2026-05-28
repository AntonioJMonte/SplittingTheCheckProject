import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from '@fastify/type-provider-zod'
import { registerUser } from '../controllers/register-user-controller'
import { authUser } from '../controllers/auth-user-controller'
import { refreshToken } from '../controllers/refresh-token-controller'
import { updatePixKey } from '../controllers/update-pix-key-controller'
import { verifyJwt } from '../middlewares/verify-jwt'
import { registerRouteSchema, authRouteSchema, refreshTokenRouteSchema } from '../schemas/auth.schema'
import { updatePixKeyRouteSchema } from '../schemas/user.schema'

export async function userRoutes(fastify: FastifyInstance) {
    const app = fastify.withTypeProvider<ZodTypeProvider>()

    app.post('/register', { schema: registerRouteSchema }, registerUser)
    app.post('/auth', { schema: authRouteSchema }, authUser)
    app.post('/refresh', { schema: refreshTokenRouteSchema }, refreshToken)
    app.patch('/users/pix-key', { schema: updatePixKeyRouteSchema, preHandler: [verifyJwt] }, updatePixKey)
}
