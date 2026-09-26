import { describe, it, expect, beforeEach } from 'vitest'
import { AcknowledgeSettlementUseCase } from '../../../application/use-cases/settlements/acknowledge-settlement-use-case'
import { InMemorySettlementRepository } from '../../doubles/in-memory-settlement-repository'
import { InMemoryMemberRepository } from '../../doubles/in-memory-member-repository'
import { Member } from '../../../domain/entities/member'
import { Settlement } from '../../../domain/entities/settlement'
import { Money } from '../../../domain/value-objects/money'
import { SettlementNotFoundError } from '../../../shared/errors/settlement-not-found-error'
import { SettlementAlreadyConfirmedError } from '../../../shared/errors/settlement-already-confirmed-error'
import { SettlementCancelledError } from '../../../shared/errors/settlement-cancelled-error'
import { UnauthorizedError } from '../../../shared/errors/unauthorized-error'
import { MemberNotFoundError } from '../../../shared/errors/member-not-found-error'
import { ConcurrentModificationError } from '../../../shared/errors/concurrent-modification-error'

describe('AcknowledgeSettlementUseCase', () => {
  let settlementRepository: InMemorySettlementRepository
  let memberRepository: InMemoryMemberRepository
  let sut: AcknowledgeSettlementUseCase

  const GROUP_ID = 'group-1'
  const FROM_USER_ID = 'from-user'
  const TO_USER_ID = 'to-user'
  let fromMember: Member
  let toMember: Member

  beforeEach(async () => {
    settlementRepository = new InMemorySettlementRepository()
    memberRepository = new InMemoryMemberRepository()
    sut = new AcknowledgeSettlementUseCase(settlementRepository, memberRepository)

    fromMember = new Member('from-member-id', FROM_USER_ID, GROUP_ID, 'MEMBER', new Date())
    toMember = new Member('to-member-id', TO_USER_ID, GROUP_ID, 'OWNER', new Date())
    await memberRepository.addMemberToGroup(fromMember)
    await memberRepository.addMemberToGroup(toMember)
  })

  function makePendingSettlement() {
    return Settlement.create({
      groupId: GROUP_ID,
      fromMemberId: fromMember.id,
      toMemberId: toMember.id,
      amount: new Money('50.00'),
    })
  }

  it('should confirm a pending settlement and return confirmedAt', async () => {
    const settlement = makePendingSettlement()
    await settlementRepository.create(settlement)

    const { settlement: result } = await sut.execute({
      settlementId: settlement.id,
      requestUserId: TO_USER_ID,
    })

    expect(result.status).toBe('CONFIRMED')
    expect(result.confirmedAt).toBeInstanceOf(Date)
    expect(result.fromMemberId).toBe(fromMember.id)
    expect(result.toMemberId).toBe(toMember.id)
    expect(result.amount.toString()).toBe('50')
  })

  it('should update the settlement status in the repository', async () => {
    const settlement = makePendingSettlement()
    await settlementRepository.create(settlement)

    await sut.execute({ settlementId: settlement.id, requestUserId: TO_USER_ID })

    expect(settlementRepository.items[0].status).toBe('CONFIRMED')
  })

  it('should throw SettlementNotFoundError when settlement does not exist', async () => {
    await expect(
      sut.execute({ settlementId: 'nonexistent', requestUserId: TO_USER_ID }),
    ).rejects.toBeInstanceOf(SettlementNotFoundError)
  })

  it('should throw SettlementAlreadyConfirmedError when already confirmed', async () => {
    const settlement = makePendingSettlement()
    settlement.confirm()
    await settlementRepository.create(settlement)

    await expect(
      sut.execute({ settlementId: settlement.id, requestUserId: TO_USER_ID }),
    ).rejects.toBeInstanceOf(SettlementAlreadyConfirmedError)
  })

  it('should throw SettlementCancelledError when settlement is cancelled', async () => {
    const settlement = makePendingSettlement()
    settlement.cancel()
    await settlementRepository.create(settlement)

    await expect(
      sut.execute({ settlementId: settlement.id, requestUserId: TO_USER_ID }),
    ).rejects.toBeInstanceOf(SettlementCancelledError)
  })

  it('should throw UnauthorizedError when requester is not the toMember user', async () => {
    const settlement = makePendingSettlement()
    await settlementRepository.create(settlement)

    await expect(
      sut.execute({ settlementId: settlement.id, requestUserId: FROM_USER_ID }),
    ).rejects.toBeInstanceOf(UnauthorizedError)
  })

  it('should throw MemberNotFoundError when toMember no longer exists', async () => {
    const settlement = makePendingSettlement()
    await settlementRepository.create(settlement)
    // Remove toMember from repository
    memberRepository.items = memberRepository.items.filter(m => m.id !== toMember.id)

    await expect(
      sut.execute({ settlementId: settlement.id, requestUserId: TO_USER_ID }),
    ).rejects.toBeInstanceOf(MemberNotFoundError)
  })

  describe('optimistic lock', () => {
    it('should let only one of two concurrent acknowledges succeed; the other gets ConcurrentModificationError', async () => {
      const settlement = makePendingSettlement()
      await settlementRepository.create(settlement)

      const results = await Promise.allSettled([
        sut.execute({ settlementId: settlement.id, requestUserId: TO_USER_ID }),
        sut.execute({ settlementId: settlement.id, requestUserId: TO_USER_ID }),
      ])

      const fulfilled = results.filter(r => r.status === 'fulfilled')
      const rejected = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      expect(fulfilled).toHaveLength(1)
      expect(rejected).toHaveLength(1)
      expect(rejected[0].reason).toBeInstanceOf(ConcurrentModificationError)
      expect(settlementRepository.items[0].status).toBe('CONFIRMED')
      expect(settlementRepository.items[0].version).toBe(1)
    })

    it('should not overwrite CANCELLED with CONFIRMED when an expense edit cancels the settlement mid-acknowledge', async () => {
      const settlement = makePendingSettlement()
      await settlementRepository.create(settlement)

      const originalFindById = memberRepository.findById.bind(memberRepository)
      memberRepository.findById = async (id: string) => {
        await settlementRepository.cancelPendingByGroupId(GROUP_ID)
        return originalFindById(id)
      }

      await expect(
        sut.execute({ settlementId: settlement.id, requestUserId: TO_USER_ID }),
      ).rejects.toBeInstanceOf(ConcurrentModificationError)
      expect(settlementRepository.items[0].status).toBe('CANCELLED')
    })

    it('should map the conflict to HTTP 409', () => {
      expect(new ConcurrentModificationError().statusCode).toBe(409)
    })
  })
})
