import { GroupRepository } from "../../repositories/group-repository";
import { Group } from "../../../domain/entities/group";

interface CreateGroupUseCaseRequest {
    name: string
    description: string
    creatorUserId: string
    currency: string
}

interface CreateGroupCaseResponse {
    group: Group
}

export class CreateGroupUseCase {

    constructor(private groupRepository: GroupRepository) {}

    async execute({ name, description, creatorUserId, currency }: CreateGroupUseCaseRequest): Promise<CreateGroupCaseResponse> {

        const group = Group.create({ name, creatorUserId, currency, description })
        await this.groupRepository.create(group)

        return { group }
    }
}