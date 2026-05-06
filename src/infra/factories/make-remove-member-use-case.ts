import { RemoveMemberUseCase } from '../../application/use-cases/groups/remove-member-use-case'
import { PrismaGroupRepository } from '../database/prisma/prismaGroupRepository'
import { PrismaMemberRepository } from '../database/prisma/prismaMemberRepository'

export function makeRemoveMemberUseCase() {
    const groupRepository = new PrismaGroupRepository()
    const memberRepository = new PrismaMemberRepository()
    return new RemoveMemberUseCase(groupRepository, memberRepository)
}
