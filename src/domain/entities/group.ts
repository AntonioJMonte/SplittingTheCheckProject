import { randomUUID } from "node:crypto";
import { DomainError } from "../../shared/errors/domain-error";
import { Member } from "./member";


export class Group {

    private _members: Member[] = []

    constructor (
        public readonly id: string,
        public readonly name: string,
        public readonly currency: string,
        members: Member[] = [],
        public readonly description?: string,
    ) {
        this._members = members
    }

    get members(): ReadonlyArray<Member> {
        return this._members
    }

    static create(props: { name: string; creatorUserId: string; currency?: string; description?: string }): Group {
        if (!props.name.trim()) {
            throw new DomainError('O nome do grupo não pode ser vazio')
        }

        const groupId = randomUUID()
        const owner = Member.createOwner({
            userId: props.creatorUserId,
            groupId,
        })

        return new Group(
            groupId,
            props.name.trim(),
            props.currency ?? 'BRL',
            [owner],
            props.description,
        )
    }


    addMember(requestedBy: Member, newUserId: string): Member {
        if (!requestedBy.isOwner()) {
            throw new DomainError('Apenas o dono pode adicionar membros')
        }

        const alreadyMember = this._members.some(m => m.userId === newUserId)
        if (alreadyMember) {
            throw new DomainError('O usuário já é membro do grupo')
        }

        const member = Member.create({ userId: newUserId, groupId: this.id })
        this._members.push(member)
        return member
    }

    removeMember(requestedBy: Member, targetUserId: string): void {
        if (!requestedBy.isOwner()) {
            throw new DomainError('Apenas o dono pode remover membros')
        }

        if (requestedBy.userId === targetUserId) {
            throw new DomainError('O dono não pode sair do grupo')
        }

        const targetIndex = this._members.findIndex(m => m.userId === targetUserId)
        if (targetIndex === -1) {
            throw new DomainError('Membro não encontrado no grupo')
        }

        this._members.splice(targetIndex, 1)
    }

    update(requestedBy: Member, props: { name?: string; description?: string; currency?: string }): Group {
        if (!requestedBy.isOwner()) {
            throw new DomainError('Apenas o dono pode atualizar o grupo')
        }
        const newName = props.name?.trim()
        if (newName !== undefined && !newName) {
            throw new DomainError('O nome do grupo não pode ser vazio')
        }
        return new Group(
            this.id,
            newName ?? this.name,
            props.currency ?? this.currency,
            [...this._members],
            props.description !== undefined ? props.description : this.description,
        )
    }

    canLeave(memberId: string): boolean {
        const member = this._members.find(m => m.id === memberId)
        if (!member) {
            throw new DomainError('Membro não encontrado no grupo')
        }

        if (!member.isOwner()) return true

        const hasOtherOwner = this._members.some(m => m.id !== memberId && m.isOwner())
        if (hasOtherOwner) return true

        const hasOtherMembers = this._members.some(m => m.id !== memberId)
        return !hasOtherMembers
    }

    updateMemberRole(memberId: string, newRole: 'OWNER' | 'MEMBER'): void {
        const index = this._members.findIndex(m => m.id === memberId)
        if (index === -1) {
            throw new DomainError('Membro não encontrado no grupo')
        }

        const member = this._members[index]
        if (member.isOwner() && newRole === 'MEMBER') {
            const hasOtherOwner = this._members.some(m => m.id !== memberId && m.isOwner())
            if (!hasOtherOwner) {
                throw new DomainError('Não é possível remover a role de owner do único dono do grupo')
            }
        }

        this._members[index] = new Member(member.id, member.userId, member.groupId, newRole, member.joinedAt)
    }

    listMembers(requestedBy: Member): ReadonlyArray<Member> {
        const isMember = this._members.some(m => m.userId === requestedBy.userId)
        if (!isMember) {
            throw new DomainError('Apenas membros do grupo podem visualizar a lista de membros')
        }
        return this._members
    }

    getOwner(): Member {
        const owner = this._members.find(m => m.isOwner())
        if (!owner) {
            throw new DomainError('Grupo sem dono — estado inválido')
        }
        return owner
    }


}