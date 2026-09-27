import { GroupRepository } from "../../repositories/group-repository";
import { Member } from "../../../domain/entities/member";
import { MemberRepository } from "../../repositories/member-repository";
import { UserRepository } from "../../repositories/users-repository";
import { Phone } from "../../../domain/value-objects/phone";
import { AppError } from "../../../shared/errors/app-error";
import { GroupNotFoundError } from "../../../shared/errors/group-not-found-error";

// D-71/D-77: o convidado é identificado por email ou telefone — quem convida não tem como
// conhecer o UUID de outra pessoa, e expor uma rota de busca abriria enumeração de usuários.
export type InviteeContact = { email: string; phone?: undefined } | { phone: string; email?: undefined }

interface AddMemberUseCaseRequest {
    groupId: string
    requestedByUserId: string
    invitee: InviteeContact
}

interface AddMemberCaseResponse {
    newMember: Member
}

export class AddMemberUseCase {

    constructor(
        private groupRepository: GroupRepository,
        private memberRepository: MemberRepository,
        private userRepository: UserRepository,
    ) {}

    async execute({ groupId, requestedByUserId, invitee }: AddMemberUseCaseRequest): Promise<AddMemberCaseResponse> {

        const group = await this.groupRepository.findById(groupId)
        if (!group) {
            throw new GroupNotFoundError()
        }

        const requestedBy = await this.memberRepository.findByUserAndGroup(requestedByUserId, groupId)
        if (!requestedBy) {
            throw new AppError('Você não é membro deste grupo', 403)
        }

        const invited = await this.findInvitee(invitee)
        if (!invited) {
            throw new AppError('Nenhum usuário registrado com esse contato', 404)
        }

        // D-78: o registro de quem saiu continua ocupando o par (userId, groupId), então
        // readicionar é reativar — criar outro violaria o @@unique e quebraria o histórico.
        const previous = await this.memberRepository.findRemovedByUserAndGroup(invited.id, groupId)
        if (previous) {
            group.reinstateMember(requestedBy, previous)
            await this.memberRepository.reactivate(previous.id)
            return { newMember: previous }
        }

        const newMember = group.addMember(requestedBy, invited.id)

        await this.memberRepository.addMemberToGroup(newMember)
        return { newMember }
    }

    private async findInvitee(invitee: InviteeContact) {
        if (invitee.email !== undefined) {
            return this.userRepository.findByEmail(invitee.email.trim().toLowerCase())
        }
        // Normaliza antes de consultar: o telefone é gravado em E.164 (D-76).
        return this.userRepository.findByPhone(new Phone(invitee.phone).value)
    }
}
