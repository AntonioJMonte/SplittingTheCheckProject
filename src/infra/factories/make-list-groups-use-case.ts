import { ListGroupsUseCase } from '../../application/use-cases/groups/list-groups-use-case'
import { PrismaGroupRepository } from '../database/prisma/prismaGroupRepository'

export function makeListGroupsUseCase() {
    const groupRepository = new PrismaGroupRepository()
    return new ListGroupsUseCase(groupRepository)
}
