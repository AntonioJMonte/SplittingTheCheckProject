import { FastifyRequest, FastifyReply } from 'fastify'
import { groupIdParam } from '../schemas/group.schema'
import { memberIdParam, updateMemberRoleBody } from '../schemas/member.schema'
import { makeUpdateMemberRoleUseCase } from '../../factories/make-update-member-role-use-case'

export async function updateMemberRole(request: FastifyRequest, reply: FastifyReply) {
    const { groupId } = groupIdParam.parse(request.params)
    const { memberId } = memberIdParam.parse(request.params)
    const { newRole } = updateMemberRoleBody.parse(request.body)

    const useCase = makeUpdateMemberRoleUseCase()
    await useCase.execute({
        groupId,
        requestingUserId: request.user.sub,
        targetMemberId: memberId,
        newRole,
    })

    return reply.status(200).send({ memberId, role: newRole })
}
