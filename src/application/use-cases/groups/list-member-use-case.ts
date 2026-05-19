import { AppError } from '../../../shared/errors/app-error'
import { GroupNotFoundError } from '../../../shared/errors/group-not-found-error'
import { GroupRepository } from '../../repositories/group-repository'
import { MemberRepository, MembersWithUser } from '../../repositories/member-repository'

interface ListMemberUseCaseRequest {
    requestingUserId: string
    groupId: string
}

interface ListMemberUseCaseResponse {
    members: MembersWithUser[]
}

export class ListMemberUseCase {

    constructor(
        private memberRepository: MemberRepository,
        private groupRepository: GroupRepository,
    ) {}

    async execute({ requestingUserId, groupId }: ListMemberUseCaseRequest): Promise<ListMemberUseCaseResponse> {
        const group = await this.groupRepository.findById(groupId)
        if (!group) {
            throw new GroupNotFoundError()
        }

        const requestedBy = group.members.find(m => m.userId === requestingUserId)
        if (!requestedBy) {
            throw new AppError('Você não é membro deste grupo', 403)
        }

        group.listMembers(requestedBy)

        const members = await this.memberRepository.findByGroupIdWithUser(groupId)
        return { members }
    }
}