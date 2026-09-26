import Decimal from 'decimal.js'
import { MemberBalance } from '../../domain/services/debt-minimizer'

export function makeBalance(memberId: string, amount: number | string): MemberBalance {
    return { memberId, balance: new Decimal(amount) }
}

export function makeBalances(amounts: Array<number | string>, prefix = 'member'): MemberBalance[] {
    return amounts.map((amount, index) => makeBalance(`${prefix}-${index + 1}`, amount))
}

// Gera `pairs` credores e `pairs` devedores de mesmo valor: a soma fecha em zero por construção,
// que é a pré-condição do DebtMinimizer e o que permite montar grupos grandes sem contas à mão.
export function makeBalancedPairs(pairs: number, amount: number | string): MemberBalance[] {
    const balances: MemberBalance[] = []
    for (let i = 1; i <= pairs; i++) {
        balances.push(makeBalance(`creditor-${i}`, new Decimal(amount).toNumber()))
        balances.push(makeBalance(`debtor-${i}`, new Decimal(amount).negated().toNumber()))
    }
    return balances
}
