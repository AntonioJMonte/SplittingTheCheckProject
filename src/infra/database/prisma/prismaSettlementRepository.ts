import { prisma } from './prismaClient'
import { SettlementRepository } from '../../../application/repositories/settlement-repository'
import { Settlement, SettlementStatus } from '../../../domain/entities/settlement'
import { Money } from '../../../domain/value-objects/money'

function toSettlement(row: {
    id: string
    groupId: string
    fromMemberId: string
    toMemberId: string
    amount: { toString(): string }
    status: string
    confirmedAt: Date | null
    pixCopyPaste: string | null
}): Settlement {
    return new Settlement(
        row.id,
        row.groupId,
        row.fromMemberId,
        row.toMemberId,
        new Money(row.amount.toString()),
        row.status as SettlementStatus,
        row.confirmedAt ?? undefined,
        row.pixCopyPaste ?? undefined,
    )
}

export class PrismaSettlementRepository implements SettlementRepository {

    async create(settlement: Settlement): Promise<void> {
        await prisma.settlement.create({
            data: {
                id: settlement.id,
                groupId: settlement.groupId,
                fromMemberId: settlement.fromMemberId,
                toMemberId: settlement.toMemberId,
                amount: settlement.amount.toString(),
                status: settlement.status,
                pixCopyPaste: settlement.pixCopyPaste,
            },
        })
    }

    async findById(id: string): Promise<Settlement | null> {
        const row = await prisma.settlement.findUnique({ where: { id } })
        if (!row) return null
        return toSettlement(row)
    }

    async findPendingBetweenMembers(fromMemberId: string, toMemberId: string): Promise<Settlement | null> {
        const row = await prisma.settlement.findFirst({
            where: { fromMemberId, toMemberId, status: 'PENDING' },
        })
        if (!row) return null
        return toSettlement(row)
    }

    async findConfirmedByMemberAndGroup(memberId: string, groupId: string): Promise<Settlement[]> {
        const rows = await prisma.settlement.findMany({
            where: {
                groupId,
                status: 'CONFIRMED',
                OR: [
                    { fromMemberId: memberId },
                    { toMemberId: memberId },
                ],
            },
        })
        return rows.map(toSettlement)
    }

    async findConfirmedByGroup(groupId: string): Promise<Settlement[]> {
        const rows = await prisma.settlement.findMany({
            where: { groupId, status: 'CONFIRMED' },
        })
        return rows.map(toSettlement)
    }

    async updateStatus(id: string, status: 'CONFIRMED' | 'CANCELLED'): Promise<void> {
        await prisma.settlement.update({
            where: { id },
            data: {
                status,
                confirmedAt: status === 'CONFIRMED' ? new Date() : undefined,
            },
        })
    }

    async cancelPendingByGroupId(groupId: string): Promise<void> {
        await prisma.settlement.updateMany({
            where: { groupId, status: 'PENDING' },
            data: { status: 'CANCELLED' },
        })
    }
}
