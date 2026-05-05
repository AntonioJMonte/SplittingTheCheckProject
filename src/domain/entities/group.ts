import { th } from "zod/v4/locales";
import { DomainError } from "../../shared/errors/domain-error";
import { Member } from "./member";


export class Group {

    constructor (
        public readonly name: string,
        public readonly groupId: string
    ) {}

    private members: Member[] = []

    static create(prop: {name: string, groupId: string}) {
        return new Group(
            prop.name,
            crypto.randomUUID(),
        )
    }

    addMember(requestedBy: Member, newUserId: string) {
        if (!requestedBy.isOwner()) {
            throw new DomainError('Only the owner can add member')
        }

        const alreadyMember = this.members.some(m => m.userId === newUserId)
        if (alreadyMember) {
            throw new DomainError('The user already group member')
        }

        this.members.push(Member.create({ userId: newUserId, groupId: this.groupId }))
    }

    removeMember (requestedBy: Member ,targetMemberId: string) {
        if (!requestedBy.isOwner) {
            throw new DomainError('Only the owner can remove members')
        }

         if (requestedBy.userId == targetMemberId) {
            throw new DomainError('The owner cannot leave')
        }


        const targetIndex = this.members.findIndex(m => m.userId === targetMemberId)
        if (targetIndex === -1) {
            throw new DomainError('Member not found in the group')
        }

        this.members.splice(targetIndex, 1)
    }
}