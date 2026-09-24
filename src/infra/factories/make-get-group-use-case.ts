import { GetGroupUseCase } from '../../application/use-cases/groups/get-group-use-case'
import { PrismaGroupRepository } from '../database/prisma/prismaGroupRepository'
import { PrismaMemberRepository } from '../database/prisma/prismaMemberRepository'

export function makeGetGroupUseCase() {
    const groupRepository = new PrismaGroupRepository()
    const memberRepository = new PrismaMemberRepository()
    return new GetGroupUseCase(groupRepository, memberRepository)
}
