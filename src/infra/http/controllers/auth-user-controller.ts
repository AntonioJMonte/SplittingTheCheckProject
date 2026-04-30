import { FastifyReply, FastifyRequest } from 'fastify'
import z from 'zod'
import { InvalidCredentialsError } from '../../../shared/errors/invalid-credentials-error'
import { authService } from '../services/authService'
import { makeAuthUserUseCase } from '../../factories/make-auth-user-use-case'

const authUserBodySchema = z.object({
    email: z.email(),
    password: z.string().min(6),
    })

    export async function authUser(request: FastifyRequest, reply: FastifyReply) {
    const { email, password } = authUserBodySchema.parse(request.body)

    try {
        const authUseCase = makeAuthUserUseCase()
        const { user } = await authUseCase.execute({ email, password })

        const accessToken = await reply.jwtSign({ sub: user.id })
        const refreshToken = authService.signRefreshToken(user.id)

        return reply
        .status(200)
        .setCookie('refreshToken', refreshToken, {
            path: '/',
            httpOnly: true,
            secure: true,
            sameSite: true,
        })
        .send({ accessToken })
    } catch (error) {
        if (error instanceof InvalidCredentialsError) {
        return reply.status(401).send({ message: error.message })
        }
        throw error
    }
}
