import { GroupRepository } from '../../repositories/group-repository'
import { MemberRepository } from '../../repositories/member-repository'
import { AppError } from '../../../shared/errors/app-error'

interface RemoveMemberUseCaseRequest {
    groupId: string
    requestedByUserId: string
    targetUserId: string
}

export class RemoveMemberUseCase {

    constructor(
        private groupRepository: GroupRepository,
        private memberRepository: MemberRepository,
    ) {}

    async execute({ groupId, requestedByUserId, targetUserId }: RemoveMemberUseCaseRequest): Promise<void> {
        const group = await this.groupRepository.findById(groupId)
        if (!group) {
            throw new AppError('Grupo não encontrado', 404)
        }

        const requestedBy = await this.memberRepository.findByUserAndGroup(requestedByUserId, groupId)
        if (!requestedBy) {
            throw new AppError('Sem permissão', 403)
        }

        const targetMember = await this.memberRepository.findByUserAndGroup(targetUserId, groupId)
        if (!targetMember) {
            throw new AppError('Usuário alvo não é membro deste grupo', 404)
        }

        group.removeMember(requestedBy, targetUserId)
        await this.memberRepository.removeMemberGroup(targetMember.id)
    }
}
