import { GroupRepository } from '../../repositories/group-repository'
import { MemberRepository } from '../../repositories/member-repository'
import { Group } from '../../../domain/entities/group'
import { AppError } from '../../../shared/errors/app-error'
import { GroupNotFoundError } from '../../../shared/errors/group-not-found-error'

interface UpdateGroupUseCaseRequest {
    groupId: string
    requestingUserId: string
    name?: string
    description?: string
    currency?: string
}

interface UpdateGroupUseCaseResponse {
    group: Group
}

export class UpdateGroupUseCase {

    constructor(
        private groupRepository: GroupRepository,
        private memberRepository: MemberRepository,
    ) {}

    async execute({
        groupId,
        requestingUserId,
        name,
        description,
        currency,
    }: UpdateGroupUseCaseRequest): Promise<UpdateGroupUseCaseResponse> {
        const group = await this.groupRepository.findById(groupId)
        if (!group) {
            throw new GroupNotFoundError()
        }

        const requestingMember = await this.memberRepository.findByUserAndGroup(requestingUserId, groupId)
        if (!requestingMember) {
            throw new AppError('Você não é membro deste grupo', 403)
        }

        const updatedGroup = group.update(requestingMember, { name, description, currency })
        await this.groupRepository.update(updatedGroup)

        return { group: updatedGroup }
    }
}
