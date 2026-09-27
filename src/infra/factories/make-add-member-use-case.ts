import { AddMemberUseCase } from '../../application/use-cases/groups/add-member-use-case'
import { PrismaGroupRepository } from '../database/prisma/prismaGroupRepository'
import { PrismaMemberRepository } from '../database/prisma/prismaMemberRepository'
import { PrismaUserRepository } from '../database/prisma/prismaUserRepository'

export function makeAddMemberUseCase() {
    const groupRepository = new PrismaGroupRepository()
    const memberRepository = new PrismaMemberRepository()
    const userRepository = new PrismaUserRepository()
    return new AddMemberUseCase(groupRepository, memberRepository, userRepository)
}
