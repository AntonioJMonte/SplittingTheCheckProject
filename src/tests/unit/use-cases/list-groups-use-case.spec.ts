import { describe, it, expect, beforeEach } from 'vitest'
import { ListGroupsUseCase } from '../../../application/use-cases/groups/list-groups-use-case'
import { InMemoryGroupRepository } from '../../../infra/database/repositories/in-memory-group-repository'
import { Group } from '../../../domain/entities/group'

describe('ListGroupsUseCase', () => {
  let groupRepository: InMemoryGroupRepository
  let sut: ListGroupsUseCase

  beforeEach(() => {
    groupRepository = new InMemoryGroupRepository()
    sut = new ListGroupsUseCase(groupRepository)
  })

  it('should return groups that the user belongs to', async () => {
    const group = Group.create({ name: 'Grupo A', creatorUserId: 'user-1', currency: 'BRL' })
    await groupRepository.create(group)

    const { groups } = await sut.execute({ userId: 'user-1' })

    expect(groups).toHaveLength(1)
    expect(groups[0].id).toBe(group.id)
  })

  it('should return an empty array when user belongs to no groups', async () => {
    const { groups } = await sut.execute({ userId: 'user-nobody' })

    expect(groups).toHaveLength(0)
  })

  it('should not return groups the user is not a member of', async () => {
    const group = Group.create({ name: 'Grupo A', creatorUserId: 'user-1', currency: 'BRL' })
    await groupRepository.create(group)

    const { groups } = await sut.execute({ userId: 'user-2' })

    expect(groups).toHaveLength(0)
  })
})
