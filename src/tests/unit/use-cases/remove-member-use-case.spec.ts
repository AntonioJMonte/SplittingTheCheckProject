import { describe, it, expect, beforeEach } from 'vitest'
import { RemoveMemberUseCase } from '../../../application/use-cases/groups/remove-member-use-case'
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

describe('RemoveMemberUseCase', () => {
  let groupRepository: InMemoryGroupRepository
  let memberRepository: InMemoryMemberRepository
  let expenseRepository: InMemoryExpenseRepository
  let settlementRepository: InMemorySettlementRepository
  let sut: RemoveMemberUseCase

  beforeEach(() => {
    groupRepository = new InMemoryGroupRepository()
    memberRepository = new InMemoryMemberRepository()
    expenseRepository = new InMemoryExpenseRepository()
    settlementRepository = new InMemorySettlementRepository()
    sut = new RemoveMemberUseCase(groupRepository, memberRepository, expenseRepository, settlementRepository)
  })

  async function makeGroupWithTwoMembers() {
    const group = Group.create({ name: 'Grupo', creatorUserId: 'owner-user', currency: 'BRL' })
    const owner = group.members[0] as Member
    const member2 = group.addMember(owner, 'member-user')
    await groupRepository.create(group)
    await memberRepository.addMemberToGroup(owner)
    await memberRepository.addMemberToGroup(member2)
    return { group, owner, member2 }
  }

  it('should remove a member with zero balance', async () => {
    const { group, owner, member2 } = await makeGroupWithTwoMembers()

    await sut.execute({ groupId: group.id, requestedByUserId: owner.userId, targetMemberId: member2.id })

    expect(memberRepository.items.find(m => m.id === member2.id)).toBeUndefined()
  })

  it('should throw GroupNotFoundError when group does not exist', async () => {
    await expect(
      sut.execute({ groupId: 'nonexistent', requestedByUserId: 'user-1', targetMemberId: 'member-2-id' }),
    ).rejects.toBeInstanceOf(GroupNotFoundError)
  })

  it('should throw AppError when requester is not a member', async () => {
    const { group, member2 } = await makeGroupWithTwoMembers()

    await expect(
      sut.execute({ groupId: group.id, requestedByUserId: 'stranger', targetMemberId: member2.id }),
    ).rejects.toBeInstanceOf(AppError)
  })

  it('should throw AppError when target member does not exist', async () => {
    const { group, owner } = await makeGroupWithTwoMembers()

    await expect(
      sut.execute({ groupId: group.id, requestedByUserId: owner.userId, targetMemberId: 'nonexistent-member-id' }),
    ).rejects.toBeInstanceOf(AppError)
  })

  it('should throw MemberHasPendingBalanceError when target has an outstanding balance', async () => {
    const { group, owner, member2 } = await makeGroupWithTwoMembers()

    const expense = Expense.create({
      groupId: group.id,
      payerId: owner.userId,
      description: 'Almoço',
      amount: new Money('60.00'),
      shareInputs: [
        { memberId: owner.id, amount: new Money('30.00') },
        { memberId: member2.id, amount: new Money('30.00') },
      ],
      splitMethod: 'EQUAL',
    })
    await expenseRepository.create(expense)

    await expect(
      sut.execute({ groupId: group.id, requestedByUserId: owner.userId, targetMemberId: member2.id }),
    ).rejects.toBeInstanceOf(MemberHasPendingBalanceError)
  })

  it('should throw DomainError when requester is not the owner', async () => {
    const { group, owner, member2 } = await makeGroupWithTwoMembers()

    await expect(
      sut.execute({ groupId: group.id, requestedByUserId: member2.userId, targetMemberId: owner.id }),
    ).rejects.toThrow()
  })
})
