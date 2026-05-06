import { GroupRepository } from '../../repositories/group-repository'
import { Group } from '../../../domain/entities/group'

interface ListGroupsUseCaseRequest {
    userId: string
}

interface ListGroupsUseCaseResponse {
    groups: Group[]
}

export class ListGroupsUseCase {

    constructor(private groupRepository: GroupRepository) {}

    async execute({ userId }: ListGroupsUseCaseRequest): Promise<ListGroupsUseCaseResponse> {
        const groups = await this.groupRepository.findByUserId(userId)
        return { groups }
    }
}
