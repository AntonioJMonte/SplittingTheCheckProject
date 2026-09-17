import { describe, it, expect, beforeEach } from 'vitest'
import { CategorizeExpenseUseCase } from '../../../application/use-cases/expenses/categorize-expense-use-case'
import { InMemoryExpenseRepository } from '../../../infra/database/repositories/in-memory-expense-repository'
import { InMemoryMemberRepository } from '../../../infra/database/repositories/in-memory-member-repository'
import { LlmExpenseCategorizer } from '../../../infra/llm/categorizer'
import { LlmClient } from '../../../infra/llm/anthropic-client'
import { Expense } from '../../../domain/entities/expense'
import { Member } from '../../../domain/entities/member'
import { Money } from '../../../domain/value-objects/money'
import { ExpenseNotFoundError } from '../../../shared/errors/expense-not-found-error'
import { NotGroupMemberError } from '../../../shared/errors/not-group-member-error'
import { FakeExpenseCategorizer } from '../../helpers/fake-expense-categorizer'

describe('CategorizeExpenseUseCase', () => {
  const GROUP_ID = 'group-1'
  const MEMBER_USER_ID = 'user-member'

  let expenseRepository: InMemoryExpenseRepository
  let memberRepository: InMemoryMemberRepository
  let categorizer: FakeExpenseCategorizer
  let sut: CategorizeExpenseUseCase
  let member: Member

  beforeEach(async () => {
    expenseRepository = new InMemoryExpenseRepository()
    memberRepository = new InMemoryMemberRepository()
    categorizer = new FakeExpenseCategorizer()
    sut = new CategorizeExpenseUseCase(expenseRepository, memberRepository, categorizer)

    member = new Member('member-1', MEMBER_USER_ID, GROUP_ID, 'MEMBER', new Date())
    await memberRepository.addMemberToGroup(member)
  })

  async function persistExpense(description = 'Rateio diverso', category?: 'Lazer') {
    const expense = Expense.create({
      groupId: GROUP_ID,
      payerId: 'someone-else',
      description,
      amount: new Money('80.00'),
      shareInputs: [{ memberId: member.id, amount: new Money('80.00') }],
      splitMethod: 'EQUAL',
      category,
    })
    await expenseRepository.create(expense)
    return expense
  }

  it('should let any group member recategorize, overwriting the current category', async () => {
    const expense = await persistExpense('Rateio diverso', 'Lazer')
    categorizer.fullResult = 'Compras'

    const { expense: result, updated } = await sut.execute({ expenseId: expense.id, requestUserId: MEMBER_USER_ID })

    expect(updated).toBe(true)
    expect(result.category).toBe('Compras')
    expect(expenseRepository.items[0].category).toBe('Compras')
    expect(categorizer.fullCalls).toEqual([{ description: 'Rateio diverso', amount: '80.00' }])
  })

  it('should not overwrite when the description changed while the categorizer was running', async () => {
    const expense = await persistExpense('Rateio diverso')
    categorizer.fullResult = 'Compras'
    categorizer.beforeCategorizeResolves = async () => {
      await expenseRepository.update(expense.update({ description: 'Cinema' }).withCategory('Lazer'))
    }

    const { expense: result, updated } = await sut.execute({ expenseId: expense.id, requestUserId: MEMBER_USER_ID })

    expect(updated).toBe(false)
    expect(result.description).toBe('Cinema')
    expect(result.category).toBe('Lazer')
    expect(expenseRepository.items[0].category).toBe('Lazer')
  })

  it('should persist "Outros" when the LLM fails instead of propagating the error', async () => {
    const failingClient: LlmClient = {
      completeStructured: async () => { throw new Error('529 overloaded') },
    }
    const realCategorizer = new LlmExpenseCategorizer(failingClient, { get: async () => null, set: async () => {} })
    sut = new CategorizeExpenseUseCase(expenseRepository, memberRepository, realCategorizer)
    const expense = await persistExpense('Rateio diverso')

    const { expense: result, updated } = await sut.execute({ expenseId: expense.id, requestUserId: MEMBER_USER_ID })

    expect(updated).toBe(true)
    expect(result.category).toBe('Outros')
    expect(expenseRepository.items[0].category).toBe('Outros')
  })

  it('should throw ExpenseNotFoundError when the expense does not exist', async () => {
    await expect(
      sut.execute({ expenseId: 'missing', requestUserId: MEMBER_USER_ID }),
    ).rejects.toBeInstanceOf(ExpenseNotFoundError)
  })

  it('should throw NotGroupMemberError and skip the categorizer when requester is not in the group', async () => {
    const expense = await persistExpense()

    await expect(
      sut.execute({ expenseId: expense.id, requestUserId: 'outsider' }),
    ).rejects.toBeInstanceOf(NotGroupMemberError)
    expect(categorizer.fullCalls).toHaveLength(0)
  })

  it('should throw ExpenseNotFoundError when the expense is deleted while categorizing', async () => {
    const expense = await persistExpense()
    categorizer.beforeCategorizeResolves = async () => {
      await expenseRepository.delete(expense.id)
    }

    await expect(
      sut.execute({ expenseId: expense.id, requestUserId: MEMBER_USER_ID }),
    ).rejects.toBeInstanceOf(ExpenseNotFoundError)
  })
})
