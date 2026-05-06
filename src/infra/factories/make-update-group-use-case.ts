import { UpdateGroupUseCase } from '../../application/use-cases/groups/update-group-use-case'
import { PrismaGroupRepository } from '../database/prisma/prismaGroupRepository'
import { PrismaMemberRepository } from '../database/prisma/prismaMemberRepository'

export function makeUpdateGroupUseCase() {
    const groupRepository = new PrismaGroupRepository()
    const memberRepository = new PrismaMemberRepository()
    return new UpdateGroupUseCase(groupRepository, memberRepository)
}
