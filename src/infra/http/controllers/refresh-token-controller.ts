import { FastifyRequest, FastifyReply } from 'fastify'
import { authService } from '../services/authService'
import { PrismaUserRepository } from '../../database/prisma/prismaUserRepository'
import { InvalidCredentialsError } from '../../../shared/errors/invalid-credentials-error'

const usersRepository = new PrismaUserRepository()

export async function refreshToken(request: FastifyRequest, reply: FastifyReply) {
    const refreshToken = request.cookies.refreshToken
    if (!refreshToken) {
        return reply.status(401).send({ message: 'Refresh token ausente' })
    }

    try {
        const { sub } = authService.verifyRefreshToken(refreshToken)
        const user = await usersRepository.findById(sub)
        if (!user) throw new InvalidCredentialsError()

        const accessToken = await reply.jwtSign({ sub: user.id })
        return reply.status(200).send({ accessToken })
    } catch (error) {
        if (error instanceof InvalidCredentialsError) {
            return reply.status(401).send({ message: error.message })
        }
        throw error
    }
    }
