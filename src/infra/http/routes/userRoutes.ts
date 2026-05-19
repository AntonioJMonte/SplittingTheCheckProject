import { FastifyInstance } from 'fastify'
import { registerUser } from '../controllers/register-user-controller'
import { authUser } from '../controllers/auth-user-controller'
import { refreshToken } from '../controllers/refresh-token-controller'
import { updatePixKey } from '../controllers/update-pix-key-controller'
import { verifyJwt } from '../middlewares/verify-jwt'
import { registerSchema, authSchema, refreshTokenSchema } from '../schemas/auth.schema'

export async function userRoutes(app: FastifyInstance) {
    app.post('/register', { schema: registerSchema }, registerUser)
    app.post('/auth', { schema: authSchema }, authUser)
    app.post('/refresh', { schema: refreshTokenSchema }, refreshToken)
    app.patch('/users/pix-key', { preHandler: [verifyJwt] }, updatePixKey)
}
