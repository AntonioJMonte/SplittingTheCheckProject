import { describe, it, expect, beforeEach } from 'vitest'
import { ListMemberUseCase } from '../../../application/use-cases/groups/list-member-use-case'
import { InMemoryGroupRepository } from '../../../infra/database/repositories/in-memory-group-repository'
import { InMemoryMemberRepository } from '../../../infra/database/repositories/in-memory-member-repository'
import { Group } from '../../../domain/entities/group'
import { Member } from '../../../domain/entities/member'
import { GroupNotFoundError } from '../../../shared/errors/group-not-found-error'
import { AppError } from '../../../shared/errors/app-error'

describe('ListMemberUseCase', () => {
  let groupRepository: InMemoryGroupRepository
  let memberRepository: InMemoryMemberRepository
  let sut: ListMemberUseCase

  beforeEach(() => {
    groupRepository = new InMemoryGroupRepository()
    memberRepository = new InMemoryMemberRepository()
    sut = new ListMemberUseCase(memberRepository, groupRepository)
  })

  async function makeGroupWithOwner(ownerUserId = 'owner-1') {
    const group = Group.create({ name: 'Grupo', creatorUserId: ownerUserId, currency: 'BRL' })
    const owner = group.members[0] as Member
    await groupRepository.create(group)
    await memberRepository.addMemberToGroup(owner)
    memberRepository.userLookup.set(owner.userId, { name: 'Owner', email: 'owner@test.com' })
    return { group, owner }
  }

  it('should return members with user data', async () => {
    const { group, owner } = await makeGroupWithOwner()

    const { members } = await sut.execute({ requestingUserId: owner.userId, groupId: group.id })

    expect(members).toHaveLength(1)
    expect(members[0].id).toBe(owner.id)
    expect(members[0].name).toBe('Owner')
  })

  it('should throw GroupNotFoundError when group does not exist', async () => {
    await expect(
      sut.execute({ requestingUserId: 'user-1', groupId: 'nonexistent' }),
    ).rejects.toBeInstanceOf(GroupNotFoundError)
  })

  it('should throw AppError when requester is not a member', async () => {
    const { group } = await makeGroupWithOwner()

    await expect(
      sut.execute({ requestingUserId: 'stranger', groupId: group.id }),
    ).rejects.toBeInstanceOf(AppError)
  })
})
