import { describe, it, expect, beforeEach } from 'vitest'
import Decimal from 'decimal.js'
import { ListExpensesUseCase } from '../../../application/use-cases/expenses/list-expenses-use-case'
import { InMemoryExpenseRepository } from '../../../infra/database/repositories/in-memory-expense-repository'
import { InMemoryMemberRepository } from '../../../infra/database/repositories/in-memory-member-repository'
import { Member } from '../../../domain/entities/member'
import { Expense } from '../../../domain/entities/expense'
import { Money } from '../../../domain/value-objects/money'
import { NotGroupMemberError } from '../../../shared/errors/not-group-member-error'

describe('ListExpensesUseCase', () => {
  let expenseRepository: InMemoryExpenseRepository
  let memberRepository: InMemoryMemberRepository
  let sut: ListExpensesUseCase

  const GROUP_ID = 'group-1'
  const USER_1_ID = 'user-1'
  const USER_2_ID = 'user-2'
  let member1: Member
  let member2: Member

  beforeEach(async () => {
    expenseRepository = new InMemoryExpenseRepository()
    memberRepository = new InMemoryMemberRepository()
    sut = new ListExpensesUseCase(expenseRepository, memberRepository)

    member1 = new Member('member-1-id', USER_1_ID, GROUP_ID, 'OWNER', new Date())
    member2 = new Member('member-2-id', USER_2_ID, GROUP_ID, 'MEMBER', new Date())
    await memberRepository.addMemberToGroup(member1)
    await memberRepository.addMemberToGroup(member2)

    expenseRepository.memberIdByUserId.set(USER_1_ID, member1.id)
    expenseRepository.memberIdByUserId.set(USER_2_ID, member2.id)
  })

  function makeExpense(payerId = USER_1_ID, amount = '60.00', category?: string) {
    return Expense.create({
      groupId: GROUP_ID,
      payerId,
      description: 'Despesa',
      amount: new Money(amount),
      shareInputs: [
        { memberId: member1.id, amount: new Money((parseFloat(amount) / 2).toFixed(2)) },
        { memberId: member2.id, amount: new Money((parseFloat(amount) / 2).toFixed(2)) },
      ],
      splitMethod: 'EQUAL',
      category,
    })
  }

  it('should return all expenses for the group', async () => {
    await expenseRepository.create(makeExpense())
    await expenseRepository.create(makeExpense(USER_2_ID, '40.00'))

    const { expenses, total } = await sut.execute({ groupId: GROUP_ID, requestUserId: USER_1_ID })

    expect(expenses).toHaveLength(2)
    expect(total).toBe(2)
  })

  it('should return empty when group has no expenses', async () => {
    const { expenses, total } = await sut.execute({ groupId: GROUP_ID, requestUserId: USER_1_ID })

    expect(expenses).toHaveLength(0)
    expect(total).toBe(0)
  })

  it('should filter by category', async () => {
    await expenseRepository.create(makeExpense(USER_1_ID, '60.00', 'FOOD'))
    await expenseRepository.create(makeExpense(USER_1_ID, '40.00', 'TRANSPORT'))

    const { expenses } = await sut.execute({
      groupId: GROUP_ID,
      requestUserId: USER_1_ID,
      filters: { category: 'FOOD' },
    })

    expect(expenses).toHaveLength(1)
    expect(expenses[0].category).toBe('FOOD')
  })

  it('should apply pagination', async () => {
    for (let i = 0; i < 5; i++) {
      await expenseRepository.create(makeExpense())
    }

    const { expenses, total } = await sut.execute({
      groupId: GROUP_ID,
      requestUserId: USER_1_ID,
      filters: { page: 1, limit: 3 },
    })

    expect(expenses).toHaveLength(3)
    expect(total).toBe(5)
  })

  it('should filter by view=paid (only expenses paid by the requester)', async () => {
    await expenseRepository.create(makeExpense(USER_1_ID))
    await expenseRepository.create(makeExpense(USER_2_ID))

    const { expenses } = await sut.execute({
      groupId: GROUP_ID,
      requestUserId: USER_1_ID,
      filters: { view: 'paid' },
    })

    expect(expenses).toHaveLength(1)
    expect(expenses[0].payerId).toBe(USER_1_ID)
  })

  it('should throw NotGroupMemberError when requester is not a member', async () => {
    await expect(
      sut.execute({ groupId: GROUP_ID, requestUserId: 'stranger' }),
    ).rejects.toBeInstanceOf(NotGroupMemberError)
  })
})
