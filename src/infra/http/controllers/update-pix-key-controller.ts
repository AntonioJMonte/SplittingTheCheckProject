import { FastifyRequest, FastifyReply } from 'fastify'
import { updatePixKeyBody } from '../schemas/user.schema'
import { makeUpdatePixKeyUseCase } from '../../factories/make-update-pix-key-use-case'

export async function updatePixKey(request: FastifyRequest, reply: FastifyReply) {
    const { pixKey } = updatePixKeyBody.parse(request.body)

    const useCase = makeUpdatePixKeyUseCase()
    await useCase.execute({
        userId: request.user.sub,
        pixKey: pixKey ?? null,
    })

    return reply.status(200).send({ message: 'Chave Pix atualizada com sucesso' })
}
