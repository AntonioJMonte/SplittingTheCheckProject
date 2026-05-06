import { randomUUID } from "node:crypto"


export class Member {

    constructor (
        public readonly id: string,
        public readonly userId: string,
        public readonly groupId: string,
        public readonly role: 'OWNER' | 'MEMBER',
        public readonly joinedAt: Date
    ) {}

    static create(props: { userId: string; groupId: string }) {
        return new Member(
            randomUUID(),
            props.userId,
            props.groupId,
            'MEMBER',
            new Date()
        )
    }

    static createOwner(props: { userId: string; groupId: string }) {
        return new Member(
            randomUUID(),
            props.userId,
            props.groupId,
            'OWNER',
            new Date()
        )
    }

    isOwner(): boolean {
        return this.role === 'OWNER'
    }
}

