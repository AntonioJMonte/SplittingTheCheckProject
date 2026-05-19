import { GroupRepository } from '../../repositories/group-repository'
import { MemberRepository } from '../../repositories/member-repository'
import { AppError } from '../../../shared/errors/app-error'
import { GroupNotFoundError } from '../../../shared/errors/group-not-found-error'

interface UpdateMemberRoleUseCaseRequest {
    groupId: string
    requestingUserId: string
    targetMemberId: string
    newRole: 'OWNER' | 'MEMBER'
}

export class UpdateMemberRoleUseCase {
    constructor(
        private groupRepository: GroupRepository,
        private memberRepository: MemberRepository,
    ) {}

    async execute({ groupId, requestingUserId, targetMemberId, newRole }: UpdateMemberRoleUseCaseRequest): Promise<void> {
        const group = await this.groupRepository.findById(groupId)
        if (!group) {
            throw new GroupNotFoundError()
        }
        const requestingMember = group.members.find(m => m.userId === requestingUserId)
        if (!requestingMember?.isOwner()) {
            throw new AppError('Apenas o owner pode alterar roles de membros', 403)
        }

        const targetMember = group.members.find(m => m.id === targetMemberId)
        if (!targetMember) {
            throw new AppError('Membro não encontrado no grupo', 404)
        }

        group.updateMemberRole(targetMemberId, newRole)
        await this.memberRepository.updateRole(targetMemberId, newRole)
    }
}