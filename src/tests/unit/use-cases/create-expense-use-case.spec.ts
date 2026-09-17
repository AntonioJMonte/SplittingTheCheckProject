import { describe, it, expect, beforeEach } from 'vitest'
import { CreateExpenseUseCase } from '../../../application/use-cases/expenses/create-expense-use-case'
import { InMemoryGroupRepository } from '../../../infra/database/repositories/in-memory-group-repository'
import { InMemoryExpenseRepository } from '../../../infra/database/repositories/in-memory-expense-repository'
import { Group } from '../../../domain/entities/group'
import { Member } from '../../../domain/entities/member'
import { GroupNotFoundError } from '../../../shared/errors/group-not-found-error'
import { PayerNotMemberError } from '../../../shared/errors/payer-not-member-error'
import { MemberNotInGroupError } from '../../../shared/errors/member-not-in-group-error'
import { FakeExpenseCategorizer } from '../../helpers/fake-expense-categorizer'

describe('CreateExpenseUseCase', () => {
  let groupRepository: InMemoryGroupRepository
  let expenseRepository: InMemoryExpenseRepository
  let categorizer: FakeExpenseCategorizer
  let sut: CreateExpenseUseCase

  beforeEach(() => {
    groupRepository = new InMemoryGroupRepository()
    expenseRepository = new InMemoryExpenseRepository()
    categorizer = new FakeExpenseCategorizer()
    sut = new CreateExpenseUseCase(groupRepository, expenseRepository, categorizer)
  })

  async function makeGroupWithTwoMembers() {
    const group = Group.create({ name: 'Grupo', creatorUserId: 'user-1', currency: 'BRL' })
    const owner = group.members[0] as Member
    const member2 = group.addMember(owner, 'user-2')
    await groupRepository.create(group)
    return { group, owner, member2 }
  }

  it('should create an expense and persist it', async () => {
    const { group, owner, member2 } = await makeGroupWithTwoMembers()

    const { expense } = await sut.execute({
      groupId: group.id,
      payerUserId: owner.userId,
      description: 'Pizza',
      amount: '60.00',
      shareInputs: [
        { memberId: owner.id, amount: '30.00' },
        { memberId: member2.id, amount: '30.00' },
      ],
      splitMethod: 'EQUAL',
    })

    expect(expense.id).toBeDefined()
    expect(expense.description).toBe('Pizza')
    expect(expense.payerId).toBe(owner.userId)
    expect(expenseRepository.items).toHaveLength(1)
  })

  it('should keep the category informed by the user without calling the categorizer', async () => {
    const { group, owner, member2 } = await makeGroupWithTwoMembers()
    categorizer.quickResults.set('Supermercado', 'Compras')

    const { expense, pendingCategorization } = await sut.execute({
      groupId: group.id,
      payerUserId: owner.userId,
      description: 'Supermercado',
      amount: '100.00',
      shareInputs: [
        { memberId: owner.id, amount: '50.00' },
        { memberId: member2.id, amount: '50.00' },
      ],
      splitMethod: 'EQUAL',
      category: 'Alimentação',
    })

    expect(expense.category).toBe('Alimentação')
    expect(pendingCategorization).toBe(false)
    expect(categorizer.quickCalls).toHaveLength(0)
    expect(categorizer.fullCalls).toHaveLength(0)
  })

  it('should persist the category resolved by rules or cache when the user sends none', async () => {
    const { group, owner, member2 } = await makeGroupWithTwoMembers()
    categorizer.quickResults.set('Uber para o aeroporto', 'Transporte')

    const { expense, pendingCategorization } = await sut.execute({
      groupId: group.id,
      payerUserId: owner.userId,
      description: 'Uber para o aeroporto',
      amount: '40.00',
      shareInputs: [
        { memberId: owner.id, amount: '20.00' },
        { memberId: member2.id, amount: '20.00' },
      ],
      splitMethod: 'EQUAL',
    })

    expect(expense.category).toBe('Transporte')
    expect(expenseRepository.items[0].category).toBe('Transporte')
    expect(pendingCategorization).toBe(false)
  })

  it('should create the expense uncategorized and flag it for background categorization without waiting for the LLM', async () => {
    const { group, owner, member2 } = await makeGroupWithTwoMembers()

    const { expense, pendingCategorization } = await sut.execute({
      groupId: group.id,
      payerUserId: owner.userId,
      description: 'Presente de amigo secreto',
      amount: '40.00',
      shareInputs: [
        { memberId: owner.id, amount: '20.00' },
        { memberId: member2.id, amount: '20.00' },
      ],
      splitMethod: 'EQUAL',
    })

    expect(expense.category).toBeUndefined()
    expect(expenseRepository.items).toHaveLength(1)
    expect(pendingCategorization).toBe(true)
    expect(categorizer.fullCalls).toHaveLength(0)
  })

  it('should throw GroupNotFoundError when group does not exist', async () => {
    await expect(
      sut.execute({
        groupId: 'nonexistent',
        payerUserId: 'user-1',
        description: 'X',
        amount: '10.00',
        shareInputs: [{ memberId: 'member-1', amount: '10.00' }],
        splitMethod: 'EQUAL',
      }),
    ).rejects.toBeInstanceOf(GroupNotFoundError)
  })

  it('should throw PayerNotMemberError when payer is not in the group', async () => {
    const { group, owner, member2 } = await makeGroupWithTwoMembers()

    await expect(
      sut.execute({
        groupId: group.id,
        payerUserId: 'outsider',
        description: 'X',
        amount: '20.00',
        shareInputs: [
          { memberId: owner.id, amount: '10.00' },
          { memberId: member2.id, amount: '10.00' },
        ],
        splitMethod: 'EQUAL',
      }),
    ).rejects.toBeInstanceOf(PayerNotMemberError)
  })

  it('should throw MemberNotInGroupError when a share refers to a non-member', async () => {
    const { group, owner } = await makeGroupWithTwoMembers()

    await expect(
      sut.execute({
        groupId: group.id,
        payerUserId: owner.userId,
        description: 'X',
        amount: '20.00',
        shareInputs: [
          { memberId: owner.id, amount: '10.00' },
          { memberId: 'outsider-member-id', amount: '10.00' },
        ],
        splitMethod: 'EQUAL',
      }),
    ).rejects.toBeInstanceOf(MemberNotInGroupError)
  })

  it('should throw DomainError when shares do not sum to total amount', async () => {
    const { group, owner, member2 } = await makeGroupWithTwoMembers()

    await expect(
      sut.execute({
        groupId: group.id,
        payerUserId: owner.userId,
        description: 'X',
        amount: '60.00',
        shareInputs: [
          { memberId: owner.id, amount: '10.00' },
          { memberId: member2.id, amount: '10.00' },
        ],
        splitMethod: 'EQUAL',
      }),
    ).rejects.toThrow()
  })
})
