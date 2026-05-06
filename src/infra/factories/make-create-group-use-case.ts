import { CreateGroupUseCase } from '../../application/use-cases/groups/create-group-use-case'
import { PrismaGroupRepository } from '../database/prisma/prismaGroupRepository'

export function makeCreateGroupUseCase() {
    const groupRepository = new PrismaGroupRepository()
    return new CreateGroupUseCase(groupRepository)
}
