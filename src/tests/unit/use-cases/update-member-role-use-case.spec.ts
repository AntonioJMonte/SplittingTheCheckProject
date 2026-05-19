import { describe, it, expect, beforeEach } from 'vitest'
import { UpdateMemberRoleUseCase } from '../../../application/use-cases/groups/update-member-role-use-case'
import { InMemoryGroupRepository } from '../../../infra/database/repositories/in-memory-group-repository'
import { InMemoryMemberRepository } from '../../../infra/database/repositories/in-memory-member-repository'
import { Group } from '../../../domain/entities/group'
import { Member } from '../../../domain/entities/member'
import { GroupNotFoundError } from '../../../shared/errors/group-not-found-error'
import { AppError } from '../../../shared/errors/app-error'
import { DomainError } from '../../../shared/errors/domain-error'

describe('UpdateMemberRoleUseCase', () => {
  let groupRepository: InMemoryGroupRepository
  let memberRepository: InMemoryMemberRepository
  let sut: UpdateMemberRoleUseCase

  beforeEach(() => {
    groupRepository = new InMemoryGroupRepository()
    memberRepository = new InMemoryMemberRepository()
    sut = new UpdateMemberRoleUseCase(groupRepository, memberRepository)
  })

  async function makeGroupWithOwnerAndMember() {
    const group = Group.create({ name: 'Grupo', creatorUserId: 'owner-1', currency: 'BRL' })
    const owner = group.members[0] as Member
    const memberEntity = group.addMember(owner, 'member-user-1')
    await groupRepository.create(group)
    await memberRepository.addMemberToGroup(owner)
    await memberRepository.addMemberToGroup(memberEntity)
    return { group, owner, memberEntity }
  }

  it('should promote a member to owner', async () => {
    const { group, owner, memberEntity } = await makeGroupWithOwnerAndMember()

    await sut.execute({
      groupId: group.id,
      requestingUserId: owner.userId,
      targetMemberId: memberEntity.id,
      newRole: 'OWNER',
    })

    const updated = await memberRepository.findById(memberEntity.id)
    expect(updated!.isOwner()).toBe(true)
  })

  it('should demote an owner to member when another owner exists', async () => {
    const group = Group.create({ name: 'Grupo', creatorUserId: 'owner-1', currency: 'BRL' })
    const owner1 = group.members[0] as Member
    const member2Entity = group.addMember(owner1, 'owner-2-user')
    // Promote member2 before persisting so the repository reflects the final state
    group.updateMemberRole(member2Entity.id, 'OWNER')
    await groupRepository.create(group)

    await memberRepository.addMemberToGroup(owner1)
    await memberRepository.addMemberToGroup(
      new Member(member2Entity.id, member2Entity.userId, member2Entity.groupId, 'OWNER', member2Entity.joinedAt),
    )

    await sut.execute({
      groupId: group.id,
      requestingUserId: owner1.userId,
      targetMemberId: owner1.id,
      newRole: 'MEMBER',
    })

    const updated = await memberRepository.findById(owner1.id)
    expect(updated!.isOwner()).toBe(false)
  })

  it('should throw GroupNotFoundError when group does not exist', async () => {
    await expect(
      sut.execute({
        groupId: 'nonexistent',
        requestingUserId: 'user-1',
        targetMemberId: 'member-1',
        newRole: 'OWNER',
      }),
    ).rejects.toBeInstanceOf(GroupNotFoundError)
  })

  it('should throw AppError when requester is not the owner', async () => {
    const { group, memberEntity } = await makeGroupWithOwnerAndMember()

    await expect(
      sut.execute({
        groupId: group.id,
        requestingUserId: memberEntity.userId,
        targetMemberId: memberEntity.id,
        newRole: 'OWNER',
      }),
    ).rejects.toBeInstanceOf(AppError)
  })

  it('should throw AppError when target member is not in the group', async () => {
    const { group, owner } = await makeGroupWithOwnerAndMember()

    await expect(
      sut.execute({
        groupId: group.id,
        requestingUserId: owner.userId,
        targetMemberId: 'nonexistent-member',
        newRole: 'OWNER',
      }),
    ).rejects.toBeInstanceOf(AppError)
  })

  it('should throw DomainError when demoting the sole owner', async () => {
    const { group, owner } = await makeGroupWithOwnerAndMember()

    await expect(
      sut.execute({
        groupId: group.id,
        requestingUserId: owner.userId,
        targetMemberId: owner.id,
        newRole: 'MEMBER',
      }),
    ).rejects.toBeInstanceOf(DomainError)
  })
})
