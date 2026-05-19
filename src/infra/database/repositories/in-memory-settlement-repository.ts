import { SettlementRepository } from '../../../application/repositories/settlement-repository'
import { Settlement } from '../../../domain/entities/settlement'

export class InMemorySettlementRepository implements SettlementRepository {
    public items: Settlement[] = []

    async create(settlement: Settlement): Promise<void> {
        this.items.push(settlement)
    }

    async findById(id: string): Promise<Settlement | null> {
        return this.items.find(s => s.id === id) ?? null
    }

    async findPendingBetweenMembers(fromMemberId: string, toMemberId: string): Promise<Settlement | null> {
        return this.items.find(
            s => s.fromMemberId === fromMemberId && s.toMemberId === toMemberId && s.status === 'PENDING',
        ) ?? null
    }

    async findConfirmedByMemberAndGroup(memberId: string, groupId: string): Promise<Settlement[]> {
        return this.items.filter(
            s =>
                s.groupId === groupId &&
                s.status === 'CONFIRMED' &&
                (s.fromMemberId === memberId || s.toMemberId === memberId),
        )
    }

    async findConfirmedByGroup(groupId: string): Promise<Settlement[]> {
        return this.items.filter(s => s.groupId === groupId && s.status === 'CONFIRMED')
    }

    async updateStatus(_id: string, _status: 'CONFIRMED' | 'CANCELLED'): Promise<void> {
        // In-memory: the entity was already mutated by the use case via domain methods
        // (settlement.confirm() / settlement.cancel()) before this persistence call.
    }

    async cancelPendingByGroupId(groupId: string): Promise<void> {
        for (const settlement of this.items) {
            if (settlement.groupId === groupId && settlement.status === 'PENDING') {
                settlement.cancel()
            }
        }
    }
}
