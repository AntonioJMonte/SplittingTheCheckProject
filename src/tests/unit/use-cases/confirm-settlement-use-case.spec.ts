import { describe, it, expect, beforeEach } from 'vitest'
import Decimal from 'decimal.js'
import { ConfirmSettlementUseCase } from '../../../application/use-cases/settlements/confirm-settlement-use-case'
import { InMemoryMemberRepository } from '../../doubles/in-memory-member-repository'
import { InMemoryExpenseRepository } from '../../doubles/in-memory-expense-repository'
import { InMemorySettlementRepository } from '../../doubles/in-memory-settlement-repository'
import { InMemoryUserRepository } from '../../doubles/in-memory-user-repository'
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
import { ConcurrentModificationError } from '../../../shared/errors/concurrent-modification-error'

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

  describe('concurrent inserts for the same pair', () => {
    function makeCompetitor(amount: string) {
      return Settlement.create({
        groupId: GROUP_ID,
        fromMemberId: fromMember.id,
        toMemberId: toMember.id,
        amount: new Money(amount),
      })
    }

    function insertCompetitorRightBeforeOurInsert(competitor: Settlement) {
      const originalCreate = settlementRepository.create.bind(settlementRepository)
      let raced = false
      settlementRepository.create = async (settlement: Settlement) => {
        if (!raced) {
          raced = true
          await originalCreate(competitor)
        }
        return originalCreate(settlement)
      }
    }

    it('should return the competing settlement when it has the same amount (idempotent double click)', async () => {
      const competitor = makeCompetitor('50.00')
      insertCompetitorRightBeforeOurInsert(competitor)

      const { settlement } = await sut.execute({
        fromMemberId: fromMember.id,
        toMemberId: toMember.id,
        amount: new Decimal('50.00'),
        requestUserId: fromMember.userId,
      })

      expect(settlement.id).toBe(competitor.id)
      expect(settlementRepository.items).toHaveLength(1)
    })

    it('should throw SettlementAlreadyPendingError when the competing settlement has another amount', async () => {
      insertCompetitorRightBeforeOurInsert(makeCompetitor('25.00'))

      await expect(
        sut.execute({
          fromMemberId: fromMember.id,
          toMemberId: toMember.id,
          amount: new Decimal('50.00'),
          requestUserId: fromMember.userId,
        }),
      ).rejects.toBeInstanceOf(SettlementAlreadyPendingError)
      expect(settlementRepository.items).toHaveLength(1)
    })

    it('should throw ConcurrentModificationError when the competing settlement left PENDING before we could read it', async () => {
      insertCompetitorRightBeforeOurInsert(makeCompetitor('50.00'))
      const originalFindPending = settlementRepository.findPendingBetweenMembers.bind(settlementRepository)
      let calls = 0
      settlementRepository.findPendingBetweenMembers = async (from: string, to: string) => {
        calls++
        return calls === 1 ? originalFindPending(from, to) : null
      }

      await expect(
        sut.execute({
          fromMemberId: fromMember.id,
          toMemberId: toMember.id,
          amount: new Decimal('50.00'),
          requestUserId: fromMember.userId,
        }),
      ).rejects.toBeInstanceOf(ConcurrentModificationError)
    })

    it('should persist a single PENDING settlement when two identical requests run concurrently', async () => {
      const request = {
        fromMemberId: fromMember.id,
        toMemberId: toMember.id,
        amount: new Decimal('50.00'),
        requestUserId: fromMember.userId,
      }

      const [first, second] = await Promise.all([sut.execute(request), sut.execute(request)])

      expect(first.settlement.id).toBe(second.settlement.id)
      expect(settlementRepository.items.filter(s => s.status === 'PENDING')).toHaveLength(1)
    })
  })
})
