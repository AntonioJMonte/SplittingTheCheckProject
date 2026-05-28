import { FastifyRequest, FastifyReply } from 'fastify'
import type z from 'zod'
import { makeUpdatePixKeyUseCase } from '../../factories/make-update-pix-key-use-case'
import type { updatePixKeyBody } from '../schemas/user.schema'

type UpdatePixKeyBody = z.infer<typeof updatePixKeyBody>

export async function updatePixKey(request: FastifyRequest<{ Body: UpdatePixKeyBody }>, reply: FastifyReply) {
    const { pixKey } = request.body

    const useCase = makeUpdatePixKeyUseCase()
    await useCase.execute({
        userId: request.user.sub,
        pixKey: pixKey ?? null,
    })

    return reply.status(200).send({ message: 'Chave Pix atualizada com sucesso' })
}
