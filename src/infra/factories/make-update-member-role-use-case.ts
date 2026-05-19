import { UpdateMemberRoleUseCase } from '../../application/use-cases/groups/update-member-role-use-case'
import { PrismaGroupRepository } from '../database/prisma/prismaGroupRepository'
import { PrismaMemberRepository } from '../database/prisma/prismaMemberRepository'

export function makeUpdateMemberRoleUseCase() {
    const groupRepository = new PrismaGroupRepository()
    const memberRepository = new PrismaMemberRepository()
    return new UpdateMemberRoleUseCase(groupRepository, memberRepository)
}