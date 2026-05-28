import { FastifyRequest, FastifyReply } from 'fastify'
import type z from 'zod'
import { makeUpdateMemberRoleUseCase } from '../../factories/make-update-member-role-use-case'
import type { groupIdParam } from '../schemas/group.schema'
import type { memberIdParam, updateMemberRoleBody } from '../schemas/member.schema'

type UpdateMemberRoleParams = z.infer<typeof groupIdParam> & z.infer<typeof memberIdParam>
type UpdateMemberRoleBody = z.infer<typeof updateMemberRoleBody>

export async function updateMemberRole(
    request: FastifyRequest<{ Params: UpdateMemberRoleParams; Body: UpdateMemberRoleBody }>,
    reply: FastifyReply,
) {
    const { groupId, memberId } = request.params
    const { newRole } = request.body

    const useCase = makeUpdateMemberRoleUseCase()
    await useCase.execute({
        groupId,
        requestingUserId: request.user.sub,
        targetMemberId: memberId,
        newRole,
    })

    return reply.status(200).send({ memberId, role: newRole })
}
