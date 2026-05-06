import { GroupRepository } from "../../repositories/group-repository";
import { Group } from "../../../domain/entities/group";
import { Member } from "../../../domain/entities/member";
import { MemberRepository } from "../../repositories/member-repository";
import { AppError } from "../../../shared/errors/app-error";

interface AddMemberUseCaseRequest {
    groupId: string
    requestedByUserId: string
    newUserId: string
}

interface AddMemberCaseResponse {
    newMember: Member
}

export class AddMemberUseCase {

    constructor(
        private groupRepository: GroupRepository,
        private memberRepository: MemberRepository
    ) {}

    async execute({ groupId, requestedByUserId, newUserId }: AddMemberUseCaseRequest): Promise<AddMemberCaseResponse> {

        const group = await this.groupRepository.findById(groupId)
        if (!group) {
            throw new AppError('Grupo não encontrado', 404)
        }

        const requestedBy = await this.memberRepository.findByUserAndGroup(requestedByUserId, groupId)
        if (!requestedBy) {
            throw new AppError('Você não é membro deste grupo', 403) 
        }
        const newMember = group.addMember(requestedBy, newUserId)

        await this.memberRepository.addMemberToGroup(newMember)
        return { newMember }
    }
}