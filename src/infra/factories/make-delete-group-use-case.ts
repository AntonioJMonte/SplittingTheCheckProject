import { DeleteGroupUseCase } from '../../application/use-cases/groups/delete-group-use-case'
import { PrismaGroupRepository } from '../database/prisma/prismaGroupRepository'
import { PrismaMemberRepository } from '../database/prisma/prismaMemberRepository'

export function makeDeleteGroupUseCase() {
    const groupRepository = new PrismaGroupRepository()
    const memberRepository = new PrismaMemberRepository()
    return new DeleteGroupUseCase(groupRepository, memberRepository)
}
