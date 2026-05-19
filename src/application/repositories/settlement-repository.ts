import { Settlement } from '../../domain/entities/settlement'

export interface SettlementRepository {
    create(settlement: Settlement): Promise<void>
    findById(id: string): Promise<Settlement | null>
    findPendingBetweenMembers(fromMemberId: string, toMemberId: string): Promise<Settlement | null>
    findConfirmedByMemberAndGroup(memberId: string, groupId: string): Promise<Settlement[]>
    findConfirmedByGroup(groupId: string): Promise<Settlement[]>
    updateStatus(id: string, status: 'CONFIRMED' | 'CANCELLED'): Promise<void>
    cancelPendingByGroupId(groupId: string): Promise<void>
}
