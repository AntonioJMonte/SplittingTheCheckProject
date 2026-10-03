import { randomUUID } from 'node:crypto'
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import { prisma } from '../../../infra/database/prisma/prismaClient'
import { PrismaGroupRepository } from '../../../infra/database/prisma/prismaGroupRepository'
import { Group } from '../../../domain/entities/group'
import { INTEGRATION_SCHEMA } from '../setup/integration-database-url'
import { resetDatabase } from '../setup/reset-database'

describe('PrismaGroupRepository (Postgres real)', () => {
    const repository = new PrismaGroupRepository()
    let aliceId: string
    let bobId: string

    beforeAll(() => {
        expect(process.env.DATABASE_URL).toContain(`schema=${INTEGRATION_SCHEMA}`)
    })

    beforeEach(async () => {
        await resetDatabase()
        const [alice, bob] = await Promise.all(['alice', 'bob'].map(name =>
            prisma.user.create({ data: { name, email: `${name}@test.com`, passwordHash: 'hash' } }),
        ))
        aliceId = alice.id
        bobId = bob.id
    })

    afterAll(async () => {
        await prisma.$disconnect()
    })

    async function createGroupWithBob() {
        const group = Group.create({ name: 'Viagem', creatorUserId: aliceId, description: 'Praia' })
        await repository.create(group)
        const bob = await prisma.member.create({ data: { userId: bobId, groupId: group.id } })
        return { group, bobMemberId: bob.id }
    }

    it('should persist the group with its owner and read the aggregate back', async () => {
        const group = Group.create({ name: 'Casa', creatorUserId: aliceId, currency: 'USD', description: 'Contas' })
        await repository.create(group)

        const found = await repository.findById(group.id)

        expect(found).toMatchObject({ id: group.id, name: 'Casa', currency: 'USD', description: 'Contas' })
        expect(found?.members).toHaveLength(1)
        expect(found?.getOwner().userId).toBe(aliceId)
    })

    it('should not leave a group without members behind when the owner insert fails', async () => {
        const group = Group.create({ name: 'Órfão', creatorUserId: randomUUID() })

        await expect(repository.create(group)).rejects.toThrow()

        expect(await prisma.group.findUnique({ where: { id: group.id } })).toBeNull()
    })

    it('should leave removed members out of the aggregate (D-73)', async () => {
        const { group, bobMemberId } = await createGroupWithBob()
        await prisma.member.update({ where: { id: bobMemberId }, data: { deletedAt: new Date(), deletedBy: aliceId } })

        const found = await repository.findById(group.id)

        expect(found?.members.map(m => m.userId)).toEqual([aliceId])
    })

    it('should list the groups of each user', async () => {
        const { group } = await createGroupWithBob()
        const other = Group.create({ name: 'Trabalho', creatorUserId: aliceId })
        await repository.create(other)

        const aliceGroups = await repository.findByUserId(aliceId)
        const bobGroups = await repository.findByUserId(bobId)

        expect(aliceGroups.map(g => g.id).sort()).toEqual([group.id, other.id].sort())
        expect(bobGroups.map(g => g.id)).toEqual([group.id])
    })

    it('should stop listing a group for a member who was removed from it (D-73)', async () => {
        const { bobMemberId } = await createGroupWithBob()
        await prisma.member.update({ where: { id: bobMemberId }, data: { deletedAt: new Date(), deletedBy: aliceId } })

        expect(await repository.findByUserId(bobId)).toEqual([])
    })

    it('should update name, description and currency', async () => {
        const group = Group.create({ name: 'Antigo', creatorUserId: aliceId })
        await repository.create(group)

        await repository.update(new Group(group.id, 'Novo', 'EUR', [...group.members], 'Descrição'))

        const row = await prisma.group.findUniqueOrThrow({ where: { id: group.id } })
        expect(row).toMatchObject({ name: 'Novo', currency: 'EUR', description: 'Descrição' })
    })

    it('should delete the group together with members, expenses and shares', async () => {
        const { group, bobMemberId } = await createGroupWithBob()
        const expense = await prisma.expense.create({
            data: {
                groupId: group.id, payerId: aliceId, description: 'Jantar', amount: '50.00', splitMethod: 'EQUAL',
                occurredAt: new Date(), shares: { create: [{ memberId: bobMemberId, amount: '50.00' }] },
            },
        })

        await repository.delete(group.id)

        expect(await prisma.group.count()).toBe(0)
        expect(await prisma.member.count()).toBe(0)
        expect(await prisma.expense.count({ where: { id: expense.id } })).toBe(0)
        expect(await prisma.expenseShare.count()).toBe(0)
    })

    it('should delete a group that has settlements between its members', async () => {
        const { group, bobMemberId } = await createGroupWithBob()
        const owner = await prisma.member.findFirstOrThrow({ where: { groupId: group.id, userId: aliceId } })
        await prisma.settlement.create({
            data: { groupId: group.id, fromMemberId: bobMemberId, toMemberId: owner.id, amount: '25.00', status: 'CONFIRMED' },
        })

        await repository.delete(group.id)

        expect(await prisma.group.count()).toBe(0)
        expect(await prisma.settlement.count()).toBe(0)
    })
})
