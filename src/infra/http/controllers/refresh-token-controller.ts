import { FastifyRequest, FastifyReply } from 'fastify'
import { JsonWebTokenError } from 'jsonwebtoken'
import { authService } from '../services/authService'
import { makeRefreshTokenUseCase } from '../../factories/make-refresh-token-use-case'
import { InvalidCredentialsError } from '../../../shared/errors/invalid-credentials-error'

export async function refreshToken(request: FastifyRequest, reply: FastifyReply) {
    const token = request.cookies.refreshToken
    if (!token) {
        return reply.status(401).send({ message: 'Refresh token ausente' })
    }

    try {
        const { sub } = authService.verifyRefreshToken(token)
        const useCase = makeRefreshTokenUseCase()
        const { user } = await useCase.execute({ userId: sub })
        const accessToken = await reply.jwtSign({ sub: user.id })
        return reply.status(200).send({ accessToken })
    } catch (error) {
        if (error instanceof InvalidCredentialsError || error instanceof JsonWebTokenError) {
            return reply.status(401).send({ message: 'Refresh token inválido' })
        }
        throw error
    }
}
