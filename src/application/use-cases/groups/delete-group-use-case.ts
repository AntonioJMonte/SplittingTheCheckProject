import { GroupRepository } from '../../repositories/group-repository'
import { MemberRepository } from '../../repositories/member-repository'
import { AppError } from '../../../shared/errors/app-error'

interface DeleteGroupUseCaseRequest {
    groupId: string
    requestingUserId: string
}

export class DeleteGroupUseCase {

    constructor(
        private groupRepository: GroupRepository,
        private memberRepository: MemberRepository,
    ) {}

    async execute({ groupId, requestingUserId }: DeleteGroupUseCaseRequest): Promise<void> {
        const group = await this.groupRepository.findById(groupId)
        if (!group) {
            throw new AppError('Grupo não encontrado', 404)
        }

        const requestingMember = await this.memberRepository.findByUserAndGroup(requestingUserId, groupId)
        if (!requestingMember) {
            throw new AppError('Você não é membro deste grupo', 403)
        }

        if (!requestingMember.isOwner()) {
            throw new AppError('Apenas o dono pode excluir o grupo', 403)
        }

        await this.groupRepository.delete(groupId)
    }
}
