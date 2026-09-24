import { FastifyRequest, FastifyReply } from 'fastify'
import { JsonWebTokenError } from 'jsonwebtoken'
import { authService } from '../services/authService'
import { makeLogoutUseCase } from '../../factories/make-logout-use-case'

// Idempotente (D-38): sem cookie, com token adulterado ou com token já expirado não há o que
// revogar, e a resposta continua 204 — repetir o logout nunca vira erro. Só uma falha ao gravar
// a revogação no Redis escapa daqui, porque nesse caso a sessão continua válida.
export async function logoutUser(request: FastifyRequest, reply: FastifyReply) {
    const token = request.cookies.refreshToken

    if (token) {
        try {
            const { exp } = authService.verifyRefreshToken(token)
            await makeLogoutUseCase().execute({ token, expiresAt: exp })
        } catch (error) {
            if (!(error instanceof JsonWebTokenError)) {
                throw error
            }
        }
    }

    return reply.clearCookie('refreshToken', { path: '/' }).status(204).send()
}
