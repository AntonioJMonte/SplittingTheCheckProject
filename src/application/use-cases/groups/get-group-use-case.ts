import { Group } from '../../../domain/entities/group'
import { GroupNotFoundError } from '../../../shared/errors/group-not-found-error'
import { NotGroupMemberError } from '../../../shared/errors/not-group-member-error'
import { GroupRepository } from '../../repositories/group-repository'
import { MemberRepository, MembersWithUser } from '../../repositories/member-repository'

interface GetGroupUseCaseRequest {
    groupId: string
    requestingUserId: string
}

interface GetGroupUseCaseResponse {
    group: Group
    members: MembersWithUser[]
}

export class GetGroupUseCase {

    constructor(
        private groupRepository: GroupRepository,
        private memberRepository: MemberRepository,
    ) {}

    async execute({ groupId, requestingUserId }: GetGroupUseCaseRequest): Promise<GetGroupUseCaseResponse> {
        const group = await this.groupRepository.findById(groupId)
        if (!group) {
            throw new GroupNotFoundError()
        }

        const isMember = group.members.some(member => member.userId === requestingUserId)
        if (!isMember) {
            throw new NotGroupMemberError()
        }

        const members = await this.memberRepository.findByGroupIdWithUser(groupId)
        return { group, members }
    }
}
