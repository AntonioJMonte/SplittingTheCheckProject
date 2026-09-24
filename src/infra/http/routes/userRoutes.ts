import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from '@fastify/type-provider-zod'
import { registerUser } from '../controllers/register-user-controller'
import { refreshToken } from '../controllers/refresh-token-controller'
import { authUser } from '../controllers/auth-logout-user-controller'
import { updatePixKey } from '../controllers/update-pix-key-controller'
import { verifyJwt } from '../middlewares/verify-jwt'
import { registerRouteSchema, authRouteSchema, refreshTokenRouteSchema, logoutRouteSchema } from '../schemas/auth.schema'
import { updatePixKeyRouteSchema } from '../schemas/user.schema'

export async function userRoutes(fastify: FastifyInstance) {
    const app = fastify.withTypeProvider<ZodTypeProvider>()

    app.post('/register', { schema: registerRouteSchema }, registerUser)
    app.post('/auth', { schema: authRouteSchema }, authUser)
    app.post('/refresh', { schema: refreshTokenRouteSchema }, refreshToken)

    // Sem verifyJwt de propósito (D-38): o logout age sobre o cookie de refresh, então precisa
    // funcionar mesmo com o access token já expirado — exigir JWT deixaria o usuário sem como sair.
    app.post('/logout', { schema: logoutRouteSchema }, authUser)

    app.patch('/users/pix-key', { schema: updatePixKeyRouteSchema, preHandler: [verifyJwt] }, updatePixKey)
}
