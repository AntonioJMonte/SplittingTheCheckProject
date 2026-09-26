import { describe, it, expect, beforeEach } from 'vitest'
import { GetGroupUseCase } from '../../../application/use-cases/groups/get-group-use-case'
import { InMemoryGroupRepository } from '../../doubles/in-memory-group-repository'
import { InMemoryMemberRepository } from '../../doubles/in-memory-member-repository'
import { Group } from '../../../domain/entities/group'
import { Member } from '../../../domain/entities/member'
import { GroupNotFoundError } from '../../../shared/errors/group-not-found-error'
import { NotGroupMemberError } from '../../../shared/errors/not-group-member-error'

describe('GetGroupUseCase', () => {
  let groupRepository: InMemoryGroupRepository
  let memberRepository: InMemoryMemberRepository
  let sut: GetGroupUseCase

  beforeEach(() => {
    groupRepository = new InMemoryGroupRepository()
    memberRepository = new InMemoryMemberRepository()
    sut = new GetGroupUseCase(groupRepository, memberRepository)
  })

  async function makeGroupWithOwner(ownerUserId = 'owner-1') {
    const group = Group.create({
      name: 'Viagem',
      creatorUserId: ownerUserId,
      currency: 'BRL',
      description: 'Rateio da viagem',
    })
    const owner = group.members[0] as Member
    await groupRepository.create(group)
    await memberRepository.addMemberToGroup(owner)
    memberRepository.userLookup.set(owner.userId, { name: 'Owner', email: 'owner@test.com' })
    return { group, owner }
  }

  it('should return the group details with its members', async () => {
    const { group, owner } = await makeGroupWithOwner()

    const result = await sut.execute({ groupId: group.id, requestingUserId: owner.userId })

    expect(result.group.id).toBe(group.id)
    expect(result.group.name).toBe('Viagem')
    expect(result.group.currency).toBe('BRL')
    expect(result.group.description).toBe('Rateio da viagem')
    expect(result.members).toHaveLength(1)
    expect(result.members[0]).toMatchObject({ id: owner.id, role: 'OWNER', name: 'Owner', email: 'owner@test.com' })
  })

  it('should list every member of the group', async () => {
    const { group, owner } = await makeGroupWithOwner()
    const second = Member.create({ userId: 'user-2', groupId: group.id })
    await memberRepository.addMemberToGroup(second)
    memberRepository.userLookup.set(second.userId, { name: 'Bia', email: 'bia@test.com' })

    const { members } = await sut.execute({ groupId: group.id, requestingUserId: owner.userId })

    expect(members).toHaveLength(2)
    expect(members.map(m => m.name)).toEqual(expect.arrayContaining(['Owner', 'Bia']))
  })

  it('should throw GroupNotFoundError when the group does not exist', async () => {
    await expect(
      sut.execute({ groupId: 'missing-group', requestingUserId: 'owner-1' }),
    ).rejects.toBeInstanceOf(GroupNotFoundError)
  })

  it('should throw NotGroupMemberError when the requester is not a member', async () => {
    const { group } = await makeGroupWithOwner()

    await expect(
      sut.execute({ groupId: group.id, requestingUserId: 'stranger' }),
    ).rejects.toBeInstanceOf(NotGroupMemberError)
  })
})
