import { ListMemberUseCase } from '../../application/use-cases/groups/list-member-use-case'
import { PrismaGroupRepository } from '../database/prisma/prismaGroupRepository'
import { PrismaMemberRepository } from '../database/prisma/prismaMemberRepository'

export function makeListMemberUseCase() {
    const memberRepository = new PrismaMemberRepository()
    const groupRepository = new PrismaGroupRepository()
    return new ListMemberUseCase(memberRepository, groupRepository)
}
