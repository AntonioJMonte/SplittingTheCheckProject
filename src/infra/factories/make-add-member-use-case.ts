import { AddMemberUseCase } from '../../application/use-cases/groups/add-member-use-case'
import { PrismaGroupRepository } from '../database/prisma/prismaGroupRepository'
import { PrismaMemberRepository } from '../database/prisma/prismaMemberRepository'

export function makeAddMemberUseCase() {
    const groupRepository = new PrismaGroupRepository()
    const memberRepository = new PrismaMemberRepository()
    return new AddMemberUseCase(groupRepository, memberRepository)
}
