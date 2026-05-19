import { describe, it, expect, beforeEach } from 'vitest'
import { DeleteGroupUseCase } from '../../../application/use-cases/groups/delete-group-use-case'
import { InMemoryGroupRepository } from '../../../infra/database/repositories/in-memory-group-repository'
import { InMemoryMemberRepository } from '../../../infra/database/repositories/in-memory-member-repository'
import { Group } from '../../../domain/entities/group'
import { Member } from '../../../domain/entities/member'
import { GroupNotFoundError } from '../../../shared/errors/group-not-found-error'
import { AppError } from '../../../shared/errors/app-error'

describe('DeleteGroupUseCase', () => {
  let groupRepository: InMemoryGroupRepository
  let memberRepository: InMemoryMemberRepository
  let sut: DeleteGroupUseCase

  beforeEach(() => {
    groupRepository = new InMemoryGroupRepository()
    memberRepository = new InMemoryMemberRepository()
    sut = new DeleteGroupUseCase(groupRepository, memberRepository)
  })

  async function makeGroupWithOwner(ownerUserId = 'owner-1') {
    const group = Group.create({ name: 'Grupo', creatorUserId: ownerUserId, currency: 'BRL' })
    const owner = group.members[0] as Member
    await groupRepository.create(group)
    await memberRepository.addMemberToGroup(owner)
    return { group, owner }
  }

  it('should delete the group when requested by the owner', async () => {
    const { group, owner } = await makeGroupWithOwner()

    await sut.execute({ groupId: group.id, requestingUserId: owner.userId })

    expect(groupRepository.items).toHaveLength(0)
  })

  it('should throw GroupNotFoundError when group does not exist', async () => {
    await expect(
      sut.execute({ groupId: 'nonexistent', requestingUserId: 'user-1' }),
    ).rejects.toBeInstanceOf(GroupNotFoundError)
  })

  it('should throw AppError when requester is not a member', async () => {
    const { group } = await makeGroupWithOwner()

    await expect(
      sut.execute({ groupId: group.id, requestingUserId: 'stranger' }),
    ).rejects.toBeInstanceOf(AppError)
  })

  it('should throw AppError when requester is a member but not owner', async () => {
    const { group } = await makeGroupWithOwner()
    const member = Member.create({ userId: 'member-1', groupId: group.id })
    await memberRepository.addMemberToGroup(member)

    await expect(
      sut.execute({ groupId: group.id, requestingUserId: 'member-1' }),
    ).rejects.toBeInstanceOf(AppError)
  })
})
