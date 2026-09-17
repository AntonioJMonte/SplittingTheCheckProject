import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { prisma } from '../../../infra/database/prisma/prismaClient'
import { PrismaSettlementRepository } from '../../../infra/database/prisma/prismaSettlementRepository'
import { Settlement } from '../../../domain/entities/settlement'
import { Money } from '../../../domain/value-objects/money'
import { INTEGRATION_SCHEMA } from '../setup/integration-database-url'

const PARALLEL_ATTEMPTS = 10

describe('PrismaSettlementRepository (Postgres real)', () => {
  const repository = new PrismaSettlementRepository()
  let groupId: string
  let fromMemberId: string
  let toMemberId: string

  beforeAll(() => {
    expect(process.env.DATABASE_URL).toContain(`schema=${INTEGRATION_SCHEMA}`)
  })

  beforeEach(async () => {
    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "ExpenseShare", "Expense", "Settlement", "Member", "Group", "User" CASCADE',
    )

    const [alice, bob] = await Promise.all(['alice', 'bob'].map(name =>
      prisma.user.create({ data: { name, email: `${name}-${randomUUID()}@test.com`, passwordHash: 'hash' } }),
    ))
    const group = await prisma.group.create({ data: { name: 'Integração' } })
    const [from, to] = await Promise.all([
      prisma.member.create({ data: { userId: bob.id, groupId: group.id } }),
      prisma.member.create({ data: { userId: alice.id, groupId: group.id, role: 'OWNER' } }),
    ])

    groupId = group.id
    fromMemberId = from.id
    toMemberId = to.id
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  function makePending(amount = '50.00') {
    return Settlement.create({ groupId, fromMemberId, toMemberId, amount: new Money(amount) })
  }

  it(`should apply exactly one of ${PARALLEL_ATTEMPTS} concurrent status updates that read the same version`, async () => {
    const settlement = makePending()
    await repository.create(settlement)

    const results = await Promise.all(
      Array.from({ length: PARALLEL_ATTEMPTS }, () => repository.updateStatus(settlement.id, 'CONFIRMED', 0)),
    )

    expect(results.filter(Boolean)).toHaveLength(1)
    const row = await prisma.settlement.findUniqueOrThrow({ where: { id: settlement.id } })
    expect(row.status).toBe('CONFIRMED')
    expect(row.version).toBe(1)
    expect(row.pendingKey).toBeNull()
  })

  it('should reject an acknowledge based on a version read before the settlement was cancelled', async () => {
    const settlement = makePending()
    await repository.create(settlement)
    const readBeforeCancel = await repository.findById(settlement.id)

    await repository.cancelPendingByGroupId(groupId)
    const applied = await repository.updateStatus(settlement.id, 'CONFIRMED', readBeforeCancel!.version)

    expect(applied).toBe(false)
    const row = await prisma.settlement.findUniqueOrThrow({ where: { id: settlement.id } })
    expect(row.status).toBe('CANCELLED')
    expect(row.version).toBe(1)
  })

  it(`should keep a single PENDING row when ${PARALLEL_ATTEMPTS} inserts for the same pair race`, async () => {
    const results = await Promise.all(
      Array.from({ length: PARALLEL_ATTEMPTS }, () => repository.create(makePending())),
    )

    expect(results.filter(Boolean)).toHaveLength(1)
    expect(await prisma.settlement.count({ where: { fromMemberId, toMemberId, status: 'PENDING' } })).toBe(1)
  })

  it('should free the pair for a new PENDING settlement once the previous one is confirmed', async () => {
    const first = makePending()
    await repository.create(first)
    await repository.updateStatus(first.id, 'CONFIRMED', 0)

    await expect(repository.create(makePending('20.00'))).resolves.toBe(true)
  })

  it('should allow PENDING settlements for the same members in opposite directions', async () => {
    await repository.create(makePending())
    const reverse = Settlement.create({ groupId, fromMemberId: toMemberId, toMemberId: fromMemberId, amount: new Money('10.00') })

    await expect(repository.create(reverse)).resolves.toBe(true)
  })

  it('should rethrow unique violations that are not about the pending pair', async () => {
    const settlement = makePending()
    await repository.create(settlement)
    await repository.updateStatus(settlement.id, 'CONFIRMED', 0)

    const sameId = new Settlement(settlement.id, groupId, fromMemberId, toMemberId, new Money('5.00'))
    await expect(repository.create(sameId)).rejects.toThrow()
  })
})
