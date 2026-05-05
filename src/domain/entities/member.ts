
export class Member {

    constructor (
        public readonly userId: string,
        public readonly groupId: string,
        public readonly role: 'OWNER' | 'MEMBER',
        public readonly joinedAt: Date
        
    ) {}

    static create(prop: {userId: string, groupId: string}) {

        return new Member(
            prop.userId,
            prop.groupId,
            "MEMBER",
            new Date()
        )
    }

    isOwner(): boolean {
        return this.role === 'OWNER'
    }
    
    canRemove(target: Member): boolean {
        return this.isOwner() && target.userId != this.userId
    }

}