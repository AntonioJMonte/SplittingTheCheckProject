import { Group } from '../../domain/entities/group'
import { Member } from '../../domain/entities/member'

interface GroupWithMembers {
    group: Group
    owner: Member
    members: Member[]
}

// Devolve o grupo já com `extraMembers` membros além do dono, todos com id previsível
// (`owner-1`, `user-2`, ...) para as asserções não dependerem de UUID aleatório.
export function makeGroupWithMembers(extraMembers = 0, name = 'Grupo de Teste'): GroupWithMembers {
    const group = Group.create({ name, creatorUserId: 'owner-1', currency: 'BRL' })
    const owner = group.members[0] as Member

    const members = [owner]
    for (let i = 0; i < extraMembers; i++) {
        members.push(Member.create({ userId: `user-${i + 2}`, groupId: group.id }))
    }

    return { group, owner, members }
}
