import { describe, it, expect, beforeEach } from 'vitest'
import Decimal from 'decimal.js'
import { ConfirmSettlementUseCase } from '../../../application/use-cases/settlements/confirm-settlement-use-case'
import { InMemoryMemberRepository } from '../../../infra/database/repositories/in-memory-member-repository'
import { InMemoryExpenseRepository } from '../../../infra/database/repositories/in-memory-expense-repository'
import { InMemorySettlementRepository } from '../../../infra/database/repositories/in-memory-settlement-repository'
import { InMemoryUserRepository } from '../../../infra/database/repositories/in-memory-user-repository'
import { PixGenerator } from '../../../application/services/pix-generator'
import { Member } from '../../../domain/entities/member'
import { User } from '../../../domain/entities/user'
import { Expense } from '../../../domain/entities/expense'
import { Settlement } from '../../../domain/entities/settlement'
import { Money } from '../../../domain/value-objects/money'
import { MemberNotFoundError } from '../../../shared/errors/member-not-found-error'
import { MemberNotInSameGroupError } from '../../../shared/errors/member-not-in-same-group-error'
import { UnauthorizedError } from '../../../shared/errors/unauthorized-error'
import { AmountExceedsDebtError } from '../../../shared/errors/amount-exceeds-debt-error'
import { SettlementAlreadyPendingError } from '../../../shared/errors/settlement-already-pending-error'

const mockPixGenerator: PixGenerator = { generate: () => 'PIX_COPY_PASTE_STRING' }

describe('ConfirmSettlementUseCase', () => {
  let memberRepository: InMemoryMemberRepository
  let expenseRepository: InMemoryExpenseRepository
  let settlementRepository: InMemorySettlementRepository
  let userRepository: InMemoryUserRepository
  let sut: ConfirmSettlementUseCase

  const GROUP_ID = 'group-1'

  let fromMember: Member
  let toMember: Member

  beforeEach(async () => {
    memberRepository = new InMemoryMemberRepository()
    expenseRepository = new InMemoryExpenseRepository()
    settlementRepository = new InMemorySettlementRepository()
    userRepository = new InMemoryUserRepository()
    sut = new ConfirmSettlementUseCase(memberRepository, expenseRepository, settlementRepository, userRepository, mockPixGenerator)

    fromMember = new Member('from-member-id', 'from-user-id', GROUP_ID, 'MEMBER', new Date())
    toMember = new Member('to-member-id', 'to-user-id', GROUP_ID, 'OWNER', new Date())
    await memberRepository.addMemberToGroup(fromMember)
    await memberRepository.addMemberToGroup(toMember)

    // toMember (owner) paid 100, fromMember owes 50
    const expense = Expense.create({
      groupId: GROUP_ID,
      payerId: toMember.userId,
      description: 'Jantar',
      amount: new Money('100.00'),
      shareInputs: [
        { memberId: fromMember.id, amount: new Money('50.00') },
        { memberId: toMember.id, amount: new Money('50.00') },
      ],
      splitMethod: 'EQUAL',
    })
    await expenseRepository.create(expense)
  })

  it('should create a PENDING settlement without pix when toMember has no pixKey', async () => {
    const toUser = User.create({ name: 'Bob', email: 'bob@test.com', passwordHash: 'hash' })
    Object.defineProperty(toUser, 'id', { value: toMember.userId })
    await userRepository.create(toUser)

    const { settlement } = await sut.execute({
      fromMemberId: fromMember.id,
      toMemberId: toMember.id,
      amount: new Decimal('50.00'),
      requestUserId: fromMember.userId,
    })

    expect(settlement.status).toBe('PENDING')
    expect(settlement.pixCopyPaste).toBeNull()
    expect(settlementRepository.items).toHaveLength(1)
  })

  it('should generate pixCopyPaste when toMember has a pixKey', async () => {
    const toUser = new User(toMember.userId, 'Bob', { value: 'bob@test.com' } as any, 'hash', 'bob@pix.com')
    await userRepository.create(toUser)

    const { settlement } = await sut.execute({
      fromMemberId: fromMember.id,
      toMemberId: toMember.id,
      amount: new Decimal('50.00'),
      requestUserId: fromMember.userId,
    })

    expect(settlement.pixCopyPaste).toBe('PIX_COPY_PASTE_STRING')
  })

  it('should return existing settlement if idempotent request (same amount)', async () => {
    const existing = Settlement.create({
      groupId: GROUP_ID,
      fromMemberId: fromMember.id,
      toMemberId: toMember.id,
      amount: new Money('50.00'),
    })
    await settlementRepository.create(existing)

    const { settlement } = await sut.execute({
      fromMemberId: fromMember.id,
      toMemberId: toMember.id,
      amount: new Decimal('50.00'),
      requestUserId: fromMember.userId,
    })

    expect(settlement.id).toBe(existing.id)
    expect(settlementRepository.items).toHaveLength(1)
  })

  it('should throw SettlementAlreadyPendingError when pending exists with different amount', async () => {
    const existing = Settlement.create({
      groupId: GROUP_ID,
      fromMemberId: fromMember.id,
      toMemberId: toMember.id,
      amount: new Money('25.00'),
    })
    await settlementRepository.create(existing)

    await expect(
      sut.execute({
        fromMemberId: fromMember.id,
        toMemberId: toMember.id,
        amount: new Decimal('50.00'),
        requestUserId: fromMember.userId,
      }),
    ).rejects.toBeInstanceOf(SettlementAlreadyPendingError)
  })

  it('should throw AmountExceedsDebtError when amount is greater than the actual debt', async () => {
    await expect(
      sut.execute({
        fromMemberId: fromMember.id,
        toMemberId: toMember.id,
        amount: new Decimal('99.00'),
        requestUserId: fromMember.userId,
      }),
    ).rejects.toBeInstanceOf(AmountExceedsDebtError)
  })

  it('should throw MemberNotFoundError when fromMember does not exist', async () => {
    await expect(
      sut.execute({
        fromMemberId: 'nonexistent',
        toMemberId: toMember.id,
        amount: new Decimal('50.00'),
        requestUserId: 'from-user-id',
      }),
    ).rejects.toBeInstanceOf(MemberNotFoundError)
  })

  it('should throw MemberNotFoundError when toMember does not exist', async () => {
    await expect(
      sut.execute({
        fromMemberId: fromMember.id,
        toMemberId: 'nonexistent',
        amount: new Decimal('50.00'),
        requestUserId: fromMember.userId,
      }),
    ).rejects.toBeInstanceOf(MemberNotFoundError)
  })

  it('should throw MemberNotInSameGroupError when members belong to different groups', async () => {
    const otherGroupMember = new Member('other-member-id', 'other-user-id', 'other-group', 'MEMBER', new Date())
    await memberRepository.addMemberToGroup(otherGroupMember)

    await expect(
      sut.execute({
        fromMemberId: fromMember.id,
        toMemberId: otherGroupMember.id,
        amount: new Decimal('50.00'),
        requestUserId: fromMember.userId,
      }),
    ).rejects.toBeInstanceOf(MemberNotInSameGroupError)
  })

  it('should throw UnauthorizedError when requestUserId is not the fromMember user', async () => {
    await expect(
      sut.execute({
        fromMemberId: fromMember.id,
        toMemberId: toMember.id,
        amount: new Decimal('50.00'),
        requestUserId: 'someone-else',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedError)
  })
})
