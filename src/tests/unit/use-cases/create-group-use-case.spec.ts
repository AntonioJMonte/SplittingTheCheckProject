import { describe, it, expect, beforeEach } from 'vitest'
import { CreateGroupUseCase } from '../../../application/use-cases/groups/create-group-use-case'
import { InMemoryGroupRepository } from '../../../infra/database/repositories/in-memory-group-repository'

describe('CreateGroupUseCase', () => {
  let groupRepository: InMemoryGroupRepository
  let sut: CreateGroupUseCase

  beforeEach(() => {
    groupRepository = new InMemoryGroupRepository()
    sut = new CreateGroupUseCase(groupRepository)
  })

  it('should create a group and persist it', async () => {
    const { group } = await sut.execute({
      name: 'Viagem',
      description: 'Viagem de férias',
      creatorUserId: 'user-1',
      currency: 'BRL',
    })

    expect(group.id).toBeDefined()
    expect(group.name).toBe('Viagem')
    expect(group.currency).toBe('BRL')
    expect(groupRepository.items).toHaveLength(1)
  })

  it('should set the creator as OWNER', async () => {
    const { group } = await sut.execute({
      name: 'Aluguel',
      description: '',
      creatorUserId: 'user-1',
      currency: 'BRL',
    })

    const owner = group.members.find(m => m.userId === 'user-1')
    expect(owner).toBeDefined()
    expect(owner!.isOwner()).toBe(true)
  })

  it('should throw DomainError when name is empty', async () => {
    await expect(
      sut.execute({ name: '   ', description: '', creatorUserId: 'user-1', currency: 'BRL' }),
    ).rejects.toThrow()
  })
})
