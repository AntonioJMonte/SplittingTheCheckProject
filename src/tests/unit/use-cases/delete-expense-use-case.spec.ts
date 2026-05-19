import { describe, it, expect, beforeEach } from 'vitest'
import { DeleteExpenseUseCase } from '../../../application/use-cases/expenses/delete-expense-use-case'
import { InMemoryExpenseRepository } from '../../../infra/database/repositories/in-memory-expense-repository'
import { InMemoryMemberRepository } from '../../../infra/database/repositories/in-memory-member-repository'
import { Member } from '../../../domain/entities/member'
import { Expense } from '../../../domain/entities/expense'
import { Money } from '../../../domain/value-objects/money'
import { ExpenseNotFoundError } from '../../../shared/errors/expense-not-found-error'
import { NotGroupMemberError } from '../../../shared/errors/not-group-member-error'
import { UnauthorizedError } from '../../../shared/errors/unauthorized-error'

describe('DeleteExpenseUseCase', () => {
  let expenseRepository: InMemoryExpenseRepository
  let memberRepository: InMemoryMemberRepository
  let sut: DeleteExpenseUseCase

  const GROUP_ID = 'group-1'
  const PAYER_USER_ID = 'payer-user'
  const OTHER_USER_ID = 'other-user'

  let ownerMember: Member
  let regularMember: Member

  beforeEach(() => {
    expenseRepository = new InMemoryExpenseRepository()
    memberRepository = new InMemoryMemberRepository()
    sut = new DeleteExpenseUseCase(expenseRepository, memberRepository)

    ownerMember = new Member('owner-member-id', PAYER_USER_ID, GROUP_ID, 'OWNER', new Date())
    regularMember = new Member('regular-member-id', OTHER_USER_ID, GROUP_ID, 'MEMBER', new Date())
  })

  function makeExpense() {
    return Expense.create({
      groupId: GROUP_ID,
      payerId: PAYER_USER_ID,
      description: 'Almoço',
      amount: new Money('30.00'),
      shareInputs: [
        { memberId: ownerMember.id, amount: new Money('15.00') },
        { memberId: regularMember.id, amount: new Money('15.00') },
      ],
      splitMethod: 'EQUAL',
    })
  }

  it('should allow the payer to delete their own expense', async () => {
    const expense = makeExpense()
    await expenseRepository.create(expense)
    await memberRepository.addMemberToGroup(ownerMember)

    await sut.execute({ expenseId: expense.id, requestUserId: PAYER_USER_ID })

    expect(expenseRepository.items).toHaveLength(0)
  })

  it('should allow a group owner to delete any expense', async () => {
    const expense = makeExpense()
    await expenseRepository.create(expense)

    // owner is different from payer
    const owner = new Member('owner-id-2', 'owner-user-2', GROUP_ID, 'OWNER', new Date())
    await memberRepository.addMemberToGroup(owner)

    await sut.execute({ expenseId: expense.id, requestUserId: owner.userId })

    expect(expenseRepository.items).toHaveLength(0)
  })

  it('should throw ExpenseNotFoundError when expense does not exist', async () => {
    await expect(
      sut.execute({ expenseId: 'nonexistent', requestUserId: PAYER_USER_ID }),
    ).rejects.toBeInstanceOf(ExpenseNotFoundError)
  })

  it('should throw NotGroupMemberError when requester is not in the group', async () => {
    const expense = makeExpense()
    await expenseRepository.create(expense)

    await expect(
      sut.execute({ expenseId: expense.id, requestUserId: 'stranger' }),
    ).rejects.toBeInstanceOf(NotGroupMemberError)
  })

  it('should throw UnauthorizedError when requester is a member but not payer or owner', async () => {
    const expense = makeExpense()
    await expenseRepository.create(expense)
    await memberRepository.addMemberToGroup(regularMember)

    await expect(
      sut.execute({ expenseId: expense.id, requestUserId: OTHER_USER_ID }),
    ).rejects.toBeInstanceOf(UnauthorizedError)
  })
})
