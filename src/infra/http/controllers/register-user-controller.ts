import { FastifyRequest, FastifyReply } from 'fastify'
import type z from 'zod'
import { UserAlreadyExistError } from '../../../shared/errors/user-already-exist-error'
import { makeRegisterUseCase } from '../../factories/make-register-use-case'
import type { registerBody } from '../schemas/auth.schema'

type RegisterBody = z.infer<typeof registerBody>

export async function registerUser(request: FastifyRequest<{ Body: RegisterBody }>, reply: FastifyReply) {
    const { name, email, password } = request.body

    try {
        const registerUseCase = makeRegisterUseCase()
        await registerUseCase.execute({ name, email, password })
    } catch (error) {
        if (error instanceof UserAlreadyExistError) {
            return reply.status(409).send({ message: error.message })
        }
        throw error
    }

    return reply.status(201).send()
}
