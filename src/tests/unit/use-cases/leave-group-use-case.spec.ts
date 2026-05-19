import { describe, it, expect, beforeEach } from 'vitest'
import { LeaveGroupUseCase } from '../../../application/use-cases/groups/leave-group-use-case'
import { InMemoryGroupRepository } from '../../../infra/database/repositories/in-memory-group-repository'
import { InMemoryMemberRepository } from '../../../infra/database/repositories/in-memory-member-repository'
import { InMemoryExpenseRepository } from '../../../infra/database/repositories/in-memory-expense-repository'
import { InMemorySettlementRepository } from '../../../infra/database/repositories/in-memory-settlement-repository'
import { Group } from '../../../domain/entities/group'
import { Member } from '../../../domain/entities/member'
import { Expense } from '../../../domain/entities/expense'
import { Money } from '../../../domain/value-objects/money'
import { GroupNotFoundError } from '../../../shared/errors/group-not-found-error'
import { AppError } from '../../../shared/errors/app-error'
import { MemberHasPendingBalanceError } from '../../../shared/errors/member-has-pending-balance-error'

describe('LeaveGroupUseCase', () => {
  let groupRepository: InMemoryGroupRepository
  let memberRepository: InMemoryMemberRepository
  let expenseRepository: InMemoryExpenseRepository
  let settlementRepository: InMemorySettlementRepository
  let sut: LeaveGroupUseCase

  beforeEach(() => {
    groupRepository = new InMemoryGroupRepository()
    memberRepository = new InMemoryMemberRepository()
    expenseRepository = new InMemoryExpenseRepository()
    settlementRepository = new InMemorySettlementRepository()
    sut = new LeaveGroupUseCase(groupRepository, memberRepository, expenseRepository, settlementRepository)
  })

  async function makeGroupWithOwnerAndMember() {
    const group = Group.create({ name: 'Grupo', creatorUserId: 'owner-user', currency: 'BRL' })
    const owner = group.members[0] as Member
    const member2 = group.addMember(owner, 'member-user')
    await groupRepository.create(group)
    await memberRepository.addMemberToGroup(owner)
    await memberRepository.addMemberToGroup(member2)
    return { group, owner, member2 }
  }

  it('should remove a regular member with zero balance', async () => {
    const { group, member2 } = await makeGroupWithOwnerAndMember()

    await sut.execute({ groupId: group.id, requestingUserId: member2.userId })

    expect(memberRepository.items.find(m => m.id === member2.id)).toBeUndefined()
  })

  it('should delete the group when the last member leaves', async () => {
    const group = Group.create({ name: 'Solo', creatorUserId: 'solo-user', currency: 'BRL' })
    const owner = group.members[0] as Member
    await groupRepository.create(group)
    await memberRepository.addMemberToGroup(owner)

    await sut.execute({ groupId: group.id, requestingUserId: owner.userId })

    expect(groupRepository.items).toHaveLength(0)
  })

  it('should throw GroupNotFoundError when group does not exist', async () => {
    await expect(
      sut.execute({ groupId: 'nonexistent', requestingUserId: 'user-1' }),
    ).rejects.toBeInstanceOf(GroupNotFoundError)
  })

  it('should throw AppError when user is not a member', async () => {
    const { group } = await makeGroupWithOwnerAndMember()

    await expect(
      sut.execute({ groupId: group.id, requestingUserId: 'stranger' }),
    ).rejects.toBeInstanceOf(AppError)
  })

  it('should throw AppError when owner tries to leave while other members exist', async () => {
    const { group, owner } = await makeGroupWithOwnerAndMember()

    await expect(
      sut.execute({ groupId: group.id, requestingUserId: owner.userId }),
    ).rejects.toBeInstanceOf(AppError)
  })

  it('should throw MemberHasPendingBalanceError when member has an outstanding balance', async () => {
    const { group, owner, member2 } = await makeGroupWithOwnerAndMember()

    // member2 owes money
    const expense = Expense.create({
      groupId: group.id,
      payerId: owner.userId,
      description: 'Conta',
      amount: new Money('40.00'),
      shareInputs: [
        { memberId: owner.id, amount: new Money('20.00') },
        { memberId: member2.id, amount: new Money('20.00') },
      ],
      splitMethod: 'EQUAL',
    })
    await expenseRepository.create(expense)

    await expect(
      sut.execute({ groupId: group.id, requestingUserId: member2.userId }),
    ).rejects.toBeInstanceOf(MemberHasPendingBalanceError)
  })
})
