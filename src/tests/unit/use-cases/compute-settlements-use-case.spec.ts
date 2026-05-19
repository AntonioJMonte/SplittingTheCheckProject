import { describe, it, expect, beforeEach } from 'vitest'
import { ComputeSettlementsUseCase } from '../../../application/use-cases/settlements/compute-settlements-use-case'
import { InMemoryGroupRepository } from '../../../infra/database/repositories/in-memory-group-repository'
import { InMemoryMemberRepository } from '../../../infra/database/repositories/in-memory-member-repository'
import { InMemoryExpenseRepository } from '../../../infra/database/repositories/in-memory-expense-repository'
import { InMemorySettlementRepository } from '../../../infra/database/repositories/in-memory-settlement-repository'
import { Group } from '../../../domain/entities/group'
import { Member } from '../../../domain/entities/member'
import { Expense } from '../../../domain/entities/expense'
import { Settlement } from '../../../domain/entities/settlement'
import { Money } from '../../../domain/value-objects/money'
import { GroupNotFoundError } from '../../../shared/errors/group-not-found-error'
import { NotGroupMemberError } from '../../../shared/errors/not-group-member-error'

describe('ComputeSettlementsUseCase', () => {
  let groupRepository: InMemoryGroupRepository
  let memberRepository: InMemoryMemberRepository
  let expenseRepository: InMemoryExpenseRepository
  let settlementRepository: InMemorySettlementRepository
  let sut: ComputeSettlementsUseCase

  beforeEach(() => {
    groupRepository = new InMemoryGroupRepository()
    memberRepository = new InMemoryMemberRepository()
    expenseRepository = new InMemoryExpenseRepository()
    settlementRepository = new InMemorySettlementRepository()
    sut = new ComputeSettlementsUseCase(groupRepository, memberRepository, expenseRepository, settlementRepository)
  })

  async function makeGroupWithTwoMembers() {
    const group = Group.create({ name: 'Grupo', creatorUserId: 'user-1', currency: 'BRL' })
    const owner = group.members[0] as Member
    const member2 = group.addMember(owner, 'user-2')
    await groupRepository.create(group)
    await memberRepository.addMemberToGroup(owner)
    await memberRepository.addMemberToGroup(member2)
    memberRepository.userLookup.set(owner.userId, { name: 'Alice', email: 'alice@test.com' })
    memberRepository.userLookup.set(member2.userId, { name: 'Bob', email: 'bob@test.com' })
    return { group, owner, member2 }
  }

  it('should return empty settlements when there are no expenses', async () => {
    const { group, owner } = await makeGroupWithTwoMembers()

    const { settlements } = await sut.execute({ groupId: group.id, requestUserId: owner.userId })

    expect(settlements).toHaveLength(0)
  })

  it('should compute correct transfer when one member owes another', async () => {
    const { group, owner, member2 } = await makeGroupWithTwoMembers()

    // owner pays 100, split 50/50 — member2 owes owner 50
    const expense = Expense.create({
      groupId: group.id,
      payerId: owner.userId,
      description: 'Jantar',
      amount: new Money('100.00'),
      shareInputs: [
        { memberId: owner.id, amount: new Money('50.00') },
        { memberId: member2.id, amount: new Money('50.00') },
      ],
      splitMethod: 'EQUAL',
    })
    await expenseRepository.create(expense)

    const { settlements } = await sut.execute({ groupId: group.id, requestUserId: owner.userId })

    expect(settlements).toHaveLength(1)
    expect(settlements[0].fromMemberId).toBe(member2.id)
    expect(settlements[0].toMemberId).toBe(owner.id)
    expect(settlements[0].fromMemberName).toBe('Bob')
    expect(settlements[0].toMemberName).toBe('Alice')
    expect(settlements[0].amount.toString()).toBe('50')
  })

  it('should account for already-confirmed settlements', async () => {
    const { group, owner, member2 } = await makeGroupWithTwoMembers()

    const expense = Expense.create({
      groupId: group.id,
      payerId: owner.userId,
      description: 'Conta',
      amount: new Money('100.00'),
      shareInputs: [
        { memberId: owner.id, amount: new Money('50.00') },
        { memberId: member2.id, amount: new Money('50.00') },
      ],
      splitMethod: 'EQUAL',
    })
    await expenseRepository.create(expense)

    // member2 already paid 50 back (confirmed settlement)
    const confirmedSettlement = Settlement.create({
      groupId: group.id,
      fromMemberId: member2.id,
      toMemberId: owner.id,
      amount: new Money('50.00'),
    })
    confirmedSettlement.confirm()
    settlementRepository.items.push(confirmedSettlement)

    const { settlements } = await sut.execute({ groupId: group.id, requestUserId: owner.userId })

    expect(settlements).toHaveLength(0)
  })

  it('should throw GroupNotFoundError when group does not exist', async () => {
    await expect(
      sut.execute({ groupId: 'nonexistent', requestUserId: 'user-1' }),
    ).rejects.toBeInstanceOf(GroupNotFoundError)
  })

  it('should throw NotGroupMemberError when requester is not a member', async () => {
    const { group } = await makeGroupWithTwoMembers()

    await expect(
      sut.execute({ groupId: group.id, requestUserId: 'stranger' }),
    ).rejects.toBeInstanceOf(NotGroupMemberError)
  })
})
