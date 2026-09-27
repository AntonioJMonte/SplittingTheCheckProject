import { FastifyRequest, FastifyReply } from 'fastify'
import type z from 'zod'
import { makeUpdatePhoneUseCase } from '../../factories/make-update-phone-use-case'
import type { updatePhoneBody } from '../schemas/user.schema'

type UpdatePhoneBody = z.infer<typeof updatePhoneBody>

export async function updatePhone(request: FastifyRequest<{ Body: UpdatePhoneBody }>, reply: FastifyReply) {
    const { phone } = request.body

    const useCase = makeUpdatePhoneUseCase()
    await useCase.execute({
        userId: request.user.sub,
        phone: phone ?? null,
    })

    return reply.status(200).send({ message: 'Telefone atualizado com sucesso' })
}
