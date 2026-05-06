import Decimal from 'decimal.js'
import { Money } from '../value-objects/money'

export interface MemberBalance {
    memberId: string
    balance: Decimal
}

export interface TransferSuggestion {
    fromMemberId: string
    toMemberId: string
    amount: Money
}

export class DebtMinimizer {
    // Greedy two-pointer O(n log n): minimises transaction count to settle all group debts.
    static minimize(balances: MemberBalance[]): TransferSuggestion[] {
        const creditors = balances
            .filter(b => b.balance.greaterThan(0))
            .map(b => ({ memberId: b.memberId, balance: b.balance }))
            .sort((a, b) => b.balance.comparedTo(a.balance))

        const debtors = balances
            .filter(b => b.balance.lessThan(0))
            .map(b => ({ memberId: b.memberId, balance: b.balance.negated() }))
            .sort((a, b) => b.balance.comparedTo(a.balance))

        const transfers: TransferSuggestion[] = []
        let i = 0
        let j = 0

        while (i < creditors.length && j < debtors.length) {
            const settled = Decimal.min(creditors[i].balance, debtors[j].balance)

            transfers.push({
                fromMemberId: debtors[j].memberId,
                toMemberId: creditors[i].memberId,
                amount: new Money(settled),
            })

            creditors[i].balance = creditors[i].balance.minus(settled)
            debtors[j].balance = debtors[j].balance.minus(settled)

            if (creditors[i].balance.isZero()) i++
            if (debtors[j].balance.isZero()) j++
        }

        return transfers
    }
}