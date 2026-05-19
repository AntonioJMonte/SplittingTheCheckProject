import { describe, it, expect, beforeEach } from 'vitest'
import { AddMemberUseCase } from '../../../application/use-cases/groups/add-member-use-case'
import { InMemoryGroupRepository } from '../../../infra/database/repositories/in-memory-group-repository'
import { InMemoryMemberRepository } from '../../../infra/database/repositories/in-memory-member-repository'
import { Group } from '../../../domain/entities/group'
import { Member } from '../../../domain/entities/member'
import { GroupNotFoundError } from '../../../shared/errors/group-not-found-error'
import { AppError } from '../../../shared/errors/app-error'
import { DomainError } from '../../../shared/errors/domain-error'

describe('AddMemberUseCase', () => {
  let groupRepository: InMemoryGroupRepository
  let memberRepository: InMemoryMemberRepository
  let sut: AddMemberUseCase

  beforeEach(() => {
    groupRepository = new InMemoryGroupRepository()
    memberRepository = new InMemoryMemberRepository()
    sut = new AddMemberUseCase(groupRepository, memberRepository)
  })

  async function makeGroupWithOwner(ownerUserId = 'owner-1') {
    const group = Group.create({ name: 'Grupo', creatorUserId: ownerUserId, currency: 'BRL' })
    const owner = group.members[0] as Member
    await groupRepository.create(group)
    await memberRepository.addMemberToGroup(owner)
    return { group, owner }
  }

  it('should add a new member when requested by the owner', async () => {
    const { group, owner } = await makeGroupWithOwner()

    const { newMember } = await sut.execute({
      groupId: group.id,
      requestedByUserId: owner.userId,
      newUserId: 'user-2',
    })

    expect(newMember.userId).toBe('user-2')
    expect(newMember.groupId).toBe(group.id)
    expect(newMember.isOwner()).toBe(false)
  })

  it('should throw GroupNotFoundError when group does not exist', async () => {
    await expect(
      sut.execute({ groupId: 'nonexistent', requestedByUserId: 'user-1', newUserId: 'user-2' }),
    ).rejects.toBeInstanceOf(GroupNotFoundError)
  })

  it('should throw AppError when requester is not a member of the group', async () => {
    const { group } = await makeGroupWithOwner()

    await expect(
      sut.execute({ groupId: group.id, requestedByUserId: 'stranger', newUserId: 'user-2' }),
    ).rejects.toBeInstanceOf(AppError)
  })

  it('should throw DomainError when requester is not the owner', async () => {
    const { group } = await makeGroupWithOwner('owner-1')
    const regularMember = Member.create({ userId: 'member-1', groupId: group.id })
    await memberRepository.addMemberToGroup(regularMember)

    await expect(
      sut.execute({ groupId: group.id, requestedByUserId: 'member-1', newUserId: 'user-2' }),
    ).rejects.toBeInstanceOf(DomainError)
  })

  it('should throw DomainError when user is already a member', async () => {
    const { group, owner } = await makeGroupWithOwner()

    await expect(
      sut.execute({ groupId: group.id, requestedByUserId: owner.userId, newUserId: owner.userId }),
    ).rejects.toBeInstanceOf(DomainError)
  })
})
