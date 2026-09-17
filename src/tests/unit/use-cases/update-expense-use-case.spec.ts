import { describe, it, expect, beforeEach } from 'vitest'
import { UpdateExpenseUseCase } from '../../../application/use-cases/expenses/update-expense-use-case'
import { InMemoryExpenseRepository } from '../../../infra/database/repositories/in-memory-expense-repository'
import { InMemoryMemberRepository } from '../../../infra/database/repositories/in-memory-member-repository'
import { InMemoryGroupRepository } from '../../../infra/database/repositories/in-memory-group-repository'
import { InMemorySettlementRepository } from '../../../infra/database/repositories/in-memory-settlement-repository'
import { Group } from '../../../domain/entities/group'
import { Member } from '../../../domain/entities/member'
import { Expense } from '../../../domain/entities/expense'
import { Settlement } from '../../../domain/entities/settlement'
import { Money } from '../../../domain/value-objects/money'
import { ExpenseNotFoundError } from '../../../shared/errors/expense-not-found-error'
import { NotGroupMemberError } from '../../../shared/errors/not-group-member-error'
import { UnauthorizedError } from '../../../shared/errors/unauthorized-error'
import { MemberNotInGroupError } from '../../../shared/errors/member-not-in-group-error'
import { FakeExpenseCategorizer } from '../../helpers/fake-expense-categorizer'

describe('UpdateExpenseUseCase', () => {
  let expenseRepository: InMemoryExpenseRepository
  let memberRepository: InMemoryMemberRepository
  let groupRepository: InMemoryGroupRepository
  let settlementRepository: InMemorySettlementRepository
  let categorizer: FakeExpenseCategorizer
  let sut: UpdateExpenseUseCase

  let group: Group
  let owner: Member
  let member2: Member

  beforeEach(async () => {
    expenseRepository = new InMemoryExpenseRepository()
    memberRepository = new InMemoryMemberRepository()
    groupRepository = new InMemoryGroupRepository()
    settlementRepository = new InMemorySettlementRepository()
    categorizer = new FakeExpenseCategorizer()
    sut = new UpdateExpenseUseCase(expenseRepository, memberRepository, groupRepository, settlementRepository, categorizer)

    group = Group.create({ name: 'Grupo', creatorUserId: 'user-1', currency: 'BRL' })
    owner = group.members[0] as Member
    member2 = group.addMember(owner, 'user-2')
    await groupRepository.create(group)
    await memberRepository.addMemberToGroup(owner)
    await memberRepository.addMemberToGroup(member2)
  })

  function makeExpense(category?: 'Alimentação' | 'Lazer') {
    return Expense.create({
      groupId: group.id,
      payerId: owner.userId,
      description: 'Jantar',
      amount: new Money('60.00'),
      shareInputs: [
        { memberId: owner.id, amount: new Money('30.00') },
        { memberId: member2.id, amount: new Money('30.00') },
      ],
      splitMethod: 'EQUAL',
      category,
    })
  }

  it('should update the description of an expense', async () => {
    const expense = makeExpense()
    await expenseRepository.create(expense)

    const { expense: updated } = await sut.execute({
      expenseId: expense.id,
      requestUserId: owner.userId,
      description: 'Almoço atualizado',
    })

    expect(updated.description).toBe('Almoço atualizado')
  })

  it('should allow a group owner to update another member\'s expense', async () => {
    // member2 is the payer; owner updates it
    const memberPayerExpense = Expense.create({
      groupId: group.id,
      payerId: member2.userId,
      description: 'Compra',
      amount: new Money('40.00'),
      shareInputs: [
        { memberId: owner.id, amount: new Money('20.00') },
        { memberId: member2.id, amount: new Money('20.00') },
      ],
      splitMethod: 'EQUAL',
    })
    await expenseRepository.create(memberPayerExpense)

    const { expense: updated } = await sut.execute({
      expenseId: memberPayerExpense.id,
      requestUserId: owner.userId,
      description: 'Compra atualizada',
    })

    expect(updated.description).toBe('Compra atualizada')
  })

  it('should cancel pending settlements when expense is updated', async () => {
    const expense = makeExpense()
    await expenseRepository.create(expense)

    const pendingSettlement = Settlement.create({
      groupId: group.id,
      fromMemberId: member2.id,
      toMemberId: owner.id,
      amount: new Money('30.00'),
    })
    await settlementRepository.create(pendingSettlement)

    await sut.execute({ expenseId: expense.id, requestUserId: owner.userId, description: 'Novo' })

    const remaining = settlementRepository.items.find(s => s.id === pendingSettlement.id)
    expect(remaining!.status).toBe('CANCELLED')
  })

  it('should throw ExpenseNotFoundError when expense does not exist', async () => {
    await expect(
      sut.execute({ expenseId: 'nonexistent', requestUserId: owner.userId }),
    ).rejects.toBeInstanceOf(ExpenseNotFoundError)
  })

  it('should throw NotGroupMemberError when requester is not a member', async () => {
    const expense = makeExpense()
    await expenseRepository.create(expense)

    await expect(
      sut.execute({ expenseId: expense.id, requestUserId: 'stranger' }),
    ).rejects.toBeInstanceOf(NotGroupMemberError)
  })

  it('should throw UnauthorizedError when requester is member but not payer or owner', async () => {
    // Create a third member who is not payer and not owner
    const thirdMember = group.addMember(owner, 'user-3')
    await memberRepository.addMemberToGroup(thirdMember)
    await groupRepository.update(group)

    const expense = makeExpense()
    await expenseRepository.create(expense)

    await expect(
      sut.execute({ expenseId: expense.id, requestUserId: thirdMember.userId }),
    ).rejects.toBeInstanceOf(UnauthorizedError)
  })

  it('should throw MemberNotInGroupError when a share refers to a non-member', async () => {
    const expense = makeExpense()
    await expenseRepository.create(expense)

    await expect(
      sut.execute({
        expenseId: expense.id,
        requestUserId: owner.userId,
        shares: [
          { memberId: owner.id, amount: '30.00' },
          { memberId: 'outsider-id', amount: '30.00' },
        ],
      }),
    ).rejects.toBeInstanceOf(MemberNotInGroupError)
  })

  describe('categorization', () => {
    it('should set the category sent by the user and skip automatic categorization', async () => {
      const expense = makeExpense('Alimentação')
      await expenseRepository.create(expense)

      const { expense: updated, pendingCategorization } = await sut.execute({
        expenseId: expense.id,
        requestUserId: owner.userId,
        description: 'Cinema com a turma',
        category: 'Lazer',
      })

      expect(updated.category).toBe('Lazer')
      expect(expenseRepository.items[0].category).toBe('Lazer')
      expect(pendingCategorization).toBe(false)
      expect(categorizer.quickCalls).toHaveLength(0)
    })

    it('should recategorize with rules or cache when only the description changes', async () => {
      const expense = makeExpense('Alimentação')
      await expenseRepository.create(expense)
      categorizer.quickResults.set('Cinema com a turma', 'Lazer')

      const { expense: updated, pendingCategorization } = await sut.execute({
        expenseId: expense.id,
        requestUserId: owner.userId,
        description: 'Cinema com a turma',
      })

      expect(updated.category).toBe('Lazer')
      expect(pendingCategorization).toBe(false)
    })

    it('should clear a stale category and flag background categorization when rules and cache cannot decide', async () => {
      const expense = makeExpense('Alimentação')
      await expenseRepository.create(expense)

      const { expense: updated, pendingCategorization } = await sut.execute({
        expenseId: expense.id,
        requestUserId: owner.userId,
        description: 'Rateio diverso',
      })

      expect(updated.category).toBeUndefined()
      expect(expenseRepository.items[0].category).toBeUndefined()
      expect(pendingCategorization).toBe(true)
      expect(categorizer.fullCalls).toHaveLength(0)
    })

    it('should keep the current category when the description does not change', async () => {
      const expense = makeExpense('Alimentação')
      await expenseRepository.create(expense)

      const { expense: updated, pendingCategorization } = await sut.execute({
        expenseId: expense.id,
        requestUserId: owner.userId,
        description: '  Jantar  ',
        amount: '60.00',
      })

      expect(updated.category).toBe('Alimentação')
      expect(pendingCategorization).toBe(false)
      expect(categorizer.quickCalls).toHaveLength(0)
    })
  })
})
