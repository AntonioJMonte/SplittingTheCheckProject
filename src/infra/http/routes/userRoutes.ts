import { FastifyInstance } from 'fastify'
import { registerUser } from '../controllers/register-user-controller'
import { authUser } from '../controllers/auth-user-controller'
import { refreshToken } from '../controllers/refresh-token-controller'

export async function userRoutes(app: FastifyInstance) {
  app.post('/register', registerUser)
  app.post('/auth', authUser)
  app.post('/refresh', refreshToken)
}