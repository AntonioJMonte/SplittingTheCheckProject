import { describe, it, expect, beforeEach } from 'vitest'
import { UpdateGroupUseCase } from '../../../application/use-cases/groups/update-group-use-case'
import { InMemoryGroupRepository } from '../../../infra/database/repositories/in-memory-group-repository'
import { InMemoryMemberRepository } from '../../../infra/database/repositories/in-memory-member-repository'
import { Group } from '../../../domain/entities/group'
import { Member } from '../../../domain/entities/member'
import { GroupNotFoundError } from '../../../shared/errors/group-not-found-error'
import { AppError } from '../../../shared/errors/app-error'
import { DomainError } from '../../../shared/errors/domain-error'

describe('UpdateGroupUseCase', () => {
  let groupRepository: InMemoryGroupRepository
  let memberRepository: InMemoryMemberRepository
  let sut: UpdateGroupUseCase

  beforeEach(() => {
    groupRepository = new InMemoryGroupRepository()
    memberRepository = new InMemoryMemberRepository()
    sut = new UpdateGroupUseCase(groupRepository, memberRepository)
  })

  async function makeGroupWithOwner(ownerUserId = 'owner-1') {
    const group = Group.create({ name: 'Grupo Original', creatorUserId: ownerUserId, currency: 'BRL' })
    const owner = group.members[0] as Member
    await groupRepository.create(group)
    await memberRepository.addMemberToGroup(owner)
    return { group, owner }
  }

  it('should update group name when requested by owner', async () => {
    const { group, owner } = await makeGroupWithOwner()

    const { group: updated } = await sut.execute({
      groupId: group.id,
      requestingUserId: owner.userId,
      name: 'Novo Nome',
    })

    expect(updated.name).toBe('Novo Nome')
    expect(groupRepository.items[0].name).toBe('Novo Nome')
  })

  it('should update description and currency', async () => {
    const { group, owner } = await makeGroupWithOwner()

    const { group: updated } = await sut.execute({
      groupId: group.id,
      requestingUserId: owner.userId,
      description: 'Nova descrição',
      currency: 'USD',
    })

    expect(updated.description).toBe('Nova descrição')
    expect(updated.currency).toBe('USD')
  })

  it('should throw GroupNotFoundError when group does not exist', async () => {
    await expect(
      sut.execute({ groupId: 'nonexistent', requestingUserId: 'user-1', name: 'X' }),
    ).rejects.toBeInstanceOf(GroupNotFoundError)
  })

  it('should throw AppError when requester is not a member', async () => {
    const { group } = await makeGroupWithOwner()

    await expect(
      sut.execute({ groupId: group.id, requestingUserId: 'stranger', name: 'X' }),
    ).rejects.toBeInstanceOf(AppError)
  })

  it('should throw DomainError when requester is not the owner', async () => {
    const { group } = await makeGroupWithOwner()
    const member = Member.create({ userId: 'member-1', groupId: group.id })
    await memberRepository.addMemberToGroup(member)

    await expect(
      sut.execute({ groupId: group.id, requestingUserId: 'member-1', name: 'X' }),
    ).rejects.toBeInstanceOf(DomainError)
  })
})
